// Summarize Survey Responses
'use server';
/**
 * @fileOverview A survey response summarization AI agent.
 *
 * - summarizeSurveyResponses - A function that handles the survey response summarization process.
 * - SummarizeSurveyResponsesInput - The input type for the summarizeSurveyResponses function.
 * - SummarizeSurveyResponsesOutput - The return type for the summarizeSurveyResponses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSurveyResponsesInputSchema = z.object({
  demographics: z.string().describe('Demographic information of the user.'),
  responses: z.array(z.string()).describe('An array of survey responses.'),
});
export type SummarizeSurveyResponsesInput = z.infer<typeof SummarizeSurveyResponsesInputSchema>;

const SummarizeSurveyResponsesOutputSchema = z.object({
  summary: z.string().describe('A personalized summary of the survey responses.'),
});
export type SummarizeSurveyResponsesOutput = z.infer<typeof SummarizeSurveyResponsesOutputSchema>;

export async function summarizeSurveyResponses(input: SummarizeSurveyResponsesInput): Promise<SummarizeSurveyResponsesOutput> {
  return summarizeSurveyResponsesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSurveyResponsesPrompt',
  input: {schema: SummarizeSurveyResponsesInputSchema},
  output: {schema: SummarizeSurveyResponsesOutputSchema},
  prompt: `You are an AI assistant that summarizes survey responses. Based on the user's answers, provide a personalized and concise summary of their overall sentiment and key takeaways. 

  The summary must be a single, well-written paragraph. Do not use more than one paragraph. Do not use line breaks.

  Demographics: {{{demographics}}}

  Survey Responses:
  {{#each responses}}
  {{@index}}. {{{this}}}
  {{/each}}
  `,
});

const summarizeSurveyResponsesFlow = ai.defineFlow(
  {
    name: 'summarizeSurveyResponsesFlow',
    inputSchema: SummarizeSurveyResponsesInputSchema,
    outputSchema: SummarizeSurveyResponsesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
