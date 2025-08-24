
'use server';

import { summarizeSurveyResponses } from '@/ai/flows/summarize-survey-responses';
import { questionOnlyQuestions, questions } from '@/lib/questions';
import type { SurveySchema } from '@/lib/schema';
import { surveySchema } from '@/lib/schema';

async function appendToGoogleSheet(data: Record<string, any>) {
  const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
  if (!SCRIPT_URL) {
    console.error("Google Script URL is not defined in environment variables.");
    return; // Don't throw an error, just log it and move on.
  }
  
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        Timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error writing to Google Sheet:", errorText);
    }
  } catch (error) {
    console.error("Fetch error when writing to Google Sheet:", error);
  }
}


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
    
    // Create a flat object of all form data for Google Sheets
    const allData = surveySchema.parse(data);
    const flatData = {
        Name: allData.name || '',
        Age: allData.age,
        Gender: allData.gender === 'other' ? allData.genderOther : allData.gender,
        'Educational Qualification': allData.education,
        'Marital Status': allData.maritalStatus,
        'Employability Status': allData.employmentStatus,
    };

    questionOnlyQuestions.forEach(q => {
      if (q.type !== 'header') {
        // Use question text as header, data key as value
        const key = q.text;
        const value = (allData as any)[q.id];
        (flatData as any)[key] = value;
      }
    });

    const googleSheetsPromise = appendToGoogleSheet(flatData).catch(err => {
        console.error("Error writing to Google Sheet:", err);
    });


    const [summaryResult] = await Promise.all([summaryPromise, googleSheetsPromise]);

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
