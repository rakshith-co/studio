
'use server';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { summarizeSurveyResponses } from '@/ai/flows/summarize-survey-responses';
import { questionOnlyQuestions, questions } from '@/lib/questions';
import type { SurveySchema } from '@/lib/schema';

async function appendToGoogleSheet(data: Record<string, any>) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);

  await doc.loadInfo(); 
  const sheet = doc.sheetsByIndex[0]; 
  
  const headers = Object.keys(data);
  const sheetHeaders = sheet.headerValues;

  if (!sheetHeaders || sheetHeaders.length === 0) {
      await sheet.setHeaderRow(headers);
  }

  await sheet.addRow(data);
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

    const likertQuestions = questionOnlyQuestions.filter(q => q.type === 'likert');
    const responses = likertQuestions.map(q => {
      const answerValue = data[q.id as keyof SurveySchema];
      const questionText = q.text;
      return `${questionText} - Response: ${answerValue}`;
    });

    const summaryPromise = summarizeSurveyResponses({ demographics, responses });
    
    const googleSheetsPromise = appendToGoogleSheet({
      Timestamp: new Date().toISOString(),
      ...demographicsData,
      ...data,
    }).catch(err => {
        console.error("Error writing to Google Sheet:", err);
        // We can decide if we want to fail the whole request or just log the error
        // For now, we'll log it and let the survey submission succeed.
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

