
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
    const demographicsData = {
      Name: data.name,
      Age: data.age,
      Gender: data.gender === 'other' ? data.genderOther : data.gender,
      'Educational Qualification': data.education,
      'Marital Status': data.maritalStatus,
      'Employability Status': data.employmentStatus,
    };

    const demographics = Object.entries(demographicsData)
      .map(([key, value]) => (value ? `${key}: ${value}` : null))
      .filter(Boolean)
      .join(', ');

    const likertQuestions = questionOnlyQuestions.filter(q => q.type !== 'header');
    const responses = likertQuestions.map(q => {
      const answerValue = data[q.id as keyof SurveySchema];
      const questionText = q.text;
      return `${questionText} - Response: ${answerValue}`;
    });

    const summaryPromise = summarizeSurveyResponses({ demographics, responses });
    
    const allData = surveySchema.parse(data);
    const flatData: Record<string, any> = {
        Timestamp: new Date().toISOString(),
        Name: allData.name || '',
        Age: allData.age,
        Gender: allData.gender === 'other' ? allData.genderOther : allData.gender,
        'Educational Qualification': allData.education,
        'Marital Status': allData.maritalStatus,
        'Employability Status': allData.employmentStatus,
    };

    questionOnlyQuestions.forEach(q => {
      if (q.type !== 'header') {
        const key = q.text;
        const value = (allData as any)[q.id];
        flatData[key] = value;
      }
    });

    // Save to Firestore
    try {
        await addDoc(collection(db, "surveys"), flatData);
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
