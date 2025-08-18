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
  prompt: `You are an AI assistant that summarizes survey responses and provides a personalized short summary of the user's overall sentiment and key takeaways. 

  Demographics: {{{demographics}}}

  Survey Responses:
  {{#each responses}}
  {{@index}}. {{{this}}}
  {{/each}}

  Provide a concise and visually appealing summary as if it were a streaming recommendation screen.
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
