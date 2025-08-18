'use server';

import { summarizeSurveyResponses } from '@/ai/flows/summarize-survey-responses';
import { questionOnlyQuestions, questions } from '@/lib/questions';
import type { SurveySchema } from '@/lib/schema';

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

    const likertQuestions = questionOnlyQuestions.filter(q => q.type === 'likert');
    const responses = likertQuestions.map(q => {
      const answerValue = data[q.id as keyof SurveySchema];
      const questionText = q.text;
      return `${questionText} - Response: ${answerValue}`;
    });

    const summaryPromise = summarizeSurveyResponses({ demographics, responses });
    
    // Placeholder for Google Sheets integration
    const googleSheetsPromise = new Promise<void>((resolve) => {
      console.log('--- SURVEY DATA FOR GOOGLE SHEETS ---');
      console.log({ ...demographicsData, ...data });
      console.log('------------------------------------');
      // In a real application, you would make an API call to a service 
      // or use a library like 'google-spreadsheet' to append a row to your sheet.
      // This requires setting up authentication (e.g., a service account) securely.
      resolve();
    });

    const [summaryResult] = await Promise.all([summaryPromise, googleSheetsPromise]);

    return {
      success: true,
      summary: summaryResult.summary,
    };
  } catch (error) {
    console.error('Error submitting survey:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
