
'use server';

import { summarizeSurveyResponses } from '@/ai/flows/summarize-survey-responses';
import { db } from '@/lib/firebase';
import { questionOnlyQuestions } from '@/lib/questions';
import type { SurveySchema } from '@/lib/schema';
import { surveySchema } from '@/lib/schema';
import { addDoc, collection } from 'firebase/firestore';
import { z } from 'zod';

export async function submitSurvey(data: SurveySchema) {
  try {
    const allData = surveySchema.parse(data);

    // --- Start AI Summary Generation (in parallel) ---
    const demographicsData = {
      Name: allData.name,
      Age: allData.age,
      Gender: allData.gender === 'other' ? allData.genderOther : allData.gender,
      'Educational Qualification': allData.education,
      'Marital Status': allData.maritalStatus,
      'Employability Status': allData.employmentStatus,
    };
    const demographics = Object.entries(demographicsData)
      .map(([key, value]) => (value ? `${key}: ${value}` : null))
      .filter(Boolean)
      .join(', ');

    const likertQuestions = questionOnlyQuestions.filter(q => q.type !== 'header' && (q.id.startsWith('dp_') || q.id.startsWith('ocb_') || q.id.startsWith('regret_')));
    const responses = likertQuestions.map(q => {
      const answerValue = data[q.id as keyof SurveySchema];
      const questionText = q.text; // The question text comes directly from the question object `q`.
      return `${questionText} - Response: ${answerValue}`;
    });

    const summaryPromise = summarizeSurveyResponses({ demographics, responses });
    // --- End AI Summary Generation ---


    // --- Prepare data for Firestore, ensuring order ---
    const orderedData: Record<string, any> = {
        Timestamp: new Date().toISOString(),
    };

    questionOnlyQuestions.forEach(q => {
        if (q.type !== 'header') {
            const key = q.text;
            let value = (allData as any)[q.id];

            // Handle the 'gender' field specifically
            if (q.id === 'gender') {
                value = allData.gender === 'other' ? allData.genderOther : allData.gender;
            }
            
            // Don't add 'genderOther' as a separate column
            if (q.id === 'genderOther') {
                return;
            }

            orderedData[key] = value || '';
        }
    });
    // --- End Firestore data preparation ---


    // Save to Firestore
    try {
        await addDoc(collection(db, "surveys"), orderedData);
    } catch (error) {
        console.error("Error writing to Firestore:", error);
        // We won't block the user for this, but we will log the error.
    }

    const summaryResult = await summaryPromise;

    return {
      success: true,
      summary: summaryResult.summary,
    };
  } catch (error) {
    console.error('Error submitting survey:', error);
    if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed: ' + error.errors.map(e => e.message).join(', '),
        };
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
