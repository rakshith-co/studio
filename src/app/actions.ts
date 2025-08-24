
'use server';

import { summarizeSurveyResponses } from '@/ai/flows/summarize-survey-responses';
import { questionOnlyQuestions } from '@/lib/questions';
import type { SurveySchema } from '@/lib/schema';
import { surveySchema } from '@/lib/schema';
import { z } from 'zod';

async function appendToGoogleSheet(data: Record<string, any>) {
  const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
  if (!SCRIPT_URL) {
    console.error("Google Script URL is not defined in environment variables.");
    return; // Don't throw an error, just log it and move on.
  }
  
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // The Google Apps Script is not a CORS-enabled endpoint.
      // We must use 'no-cors' mode to avoid a CORS error in the browser.
      // In 'no-cors' mode, we can't see the response, but the request will go through.
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // In 'no-cors' mode, we can't access the response properties.
    // We have to assume it was successful if no network error was thrown.
    // console.log("Data sent to Google Sheet.");

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
        const key = q.text; // Use question text as the key (column header)
        const value = (allData as any)[q.id];
        flatData[key] = value;
      }
    });

    // Don't wait for the Google Sheets promise to resolve.
    // Fire and forget to avoid delaying the UI response.
    appendToGoogleSheet(flatData);

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
