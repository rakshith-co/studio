export type Option = {
  label: string;
  value: string;
};

export type Question = {
  id: string;
  type: 'text' | 'number' | 'radio' | 'radio-other' | 'likert' | 'header';
  text: string;
  options?: Option[];
  required?: boolean;
};

export const questions: Question[] = [
  {
    id: 'intro',
    type: 'header',
    text: "Alright let's get to know you a bit",
  },
  {
    id: 'name',
    type: 'text',
    text: 'What is your name? (Optional)',
    required: false,
  },
  {
    id: 'age',
    type: 'number',
    text: 'What is your age (in completed years)?',
    required: true,
  },
  {
    id: 'gender',
    type: 'radio-other',
    text: 'Gender',
    required: true,
    options: [
      { label: 'Male', value: 'male' },
      { label: 'Female', value: 'female' },
    ],
  },
  {
    id: 'education',
    type: 'radio',
    text: 'Educational Qualification',
    required: true,
    options: [
      { label: '10th grade', value: '10th' },
      { label: '12th grade', value: '12th' },
      { label: 'Undergraduation', value: 'ug' },
      { label: 'Post-graduation', value: 'pg' },
      { label: 'PhD', value: 'phd' },
      { label: 'Postdoctoral researcher', value: 'postdoc' },
    ],
  },
  {
    id: 'maritalStatus',
    type: 'radio',
    text: 'Marital Status',
    required: true,
    options: [
      { label: 'Single', value: 'single' },
      { label: 'Married', value: 'married' },
      { label: 'Widowed', value: 'widowed' },
      { label: 'Divorced', value: 'divorced' },
    ],
  },
  {
    id: 'employmentStatus',
    type: 'radio',
    text: 'Employability Status',
    required: true,
    options: [
      { label: 'Employed', value: 'employed' },
      { label: 'Unemployed', value: 'unemployed' },
      { label: 'Retired', value: 'retired' },
    ],
  },
  {
    id: 'darkPatternsHeader',
    type: 'header',
    text: "Great! Let's see if you experience dark patterns in quick commerce apps",
  },
  ...[
    'Adding additional products to users’ shopping carts without their consent in quick com apps. (Example: An extra snack or trial product gets added automatically at checkout.)',
    'Revealing previously undisclosed charges to users right before they make a purchase in quick com apps. (Example: Delivery fees or platform charges appear only on the final bill.)',
    'Charging users a recurring fee under the pretense of a one-time fee or a free trial in quick com apps. (Example: A “free delivery trial” turns into an auto-renewed paid plan.)',
    'Indicating to users that a deal or discount will expire using a counting-down timer in quick com apps. (Example: “Hurry! 10 minutes left to claim this offer.”)',
    'Indicating to users that a deal or sale will expire soon without specifying a deadline in quick com apps. (Example: “Offer valid for a short time only.”)',
    'Using language and emotion (shame) to steer users away from making a certain choice in quick com apps. (Example: A pop-up says, “No thanks, I don’t like saving money.”)',
    'Using style and visual presentation to steer users to or away from certain choices in quick com apps. (Example: Costlier delivery options are shown in bold while cheaper ones are hidden.)',
    'Using confusing language to steer users into making certain choices in quick com apps. (Example: Opt-out boxes for promotions are worded in a tricky way.)',
    'Pre-selecting more expensive variations of a product, or pressuring the user to accept the more expensive variations of a product and related products in quick com apps. (Example: A larger pack of groceries is pre-selected instead of the smaller one.)',
    'Informing the user about the activity on the platform (e.g., purchases, views, visits) in quick com apps. (Example: “20 people ordered this item in the last 5 minutes.”)',
    'Testimonials on a product page whose origin is unclear in quick com apps. (Example: Generic reviews like “Great product!” without buyer verification.)',
    'Indicating to users that limited quantities of a product are available, increasing its desirability in quick com apps. (Example: “Only 2 units left – order now.”)',
    'Indicating to users that a product is in high demand and likely to sell out soon, increasing its desirability in quick com apps. (Example: “Selling fast! Almost gone.”)',
    'Making it easy for the user to sign up for a service but hard to cancel it in quick com apps. (Example: Cancelling or modifying an order requires multiple steps.)',
    'Coercing users to create accounts or share their information to complete their tasks in quick com apps. (Example: The app forces sign-up before browsing products.)',
  ].map((q, i) => ({
    id: `dp_${i + 1}`,
    type: 'likert' as const,
    text: q,
    required: true,
  })),
  {
    id: 'ocbHeader',
    type: 'header',
    text: "Now, let's see how they affect Online Consumer Behavior",
  },
  ...[
    'The quick commerce app has an attractive and appealing design.',
    'The quick commerce app interface is user-friendly and easy to navigate.',
    'The quick commerce app provides clear product information.',
    'The quick commerce app has a good reputation in the market.',
    'I trust this quick commerce app’s brand and services.',
    'The quick commerce app provides reliable and quality products.',
    'I have a positive attitude toward shopping on quick commerce apps.',
    'Shopping on quick commerce apps is a good idea for purchasing products.',
    'I find shopping on quick commerce apps to be advantageous.',
    'I trust quick commerce apps to protect my personal information.',
    'I believe quick commerce apps will deliver products as promised.',
    'I trust the payment security systems of quick commerce apps.',
    'The convenience of shopping from home motivates my purchases on quick commerce apps.',
    'Promotional offers and discounts affect my decisions when using quick commerce apps.',
    'An urgent need for products drives me to shop using quick commerce apps',
  ].map((q, i) => ({
    id: `ocb_${i + 1}`,
    type: 'likert' as const,
    text: q,
    required: true,
  })),
];

export const likertOptions: Option[] = [
    { label: 'Strongly Disagree', value: '1' },
    { label: 'Disagree', value: '2' },
    { label: 'Neutral', value: '3' },
    { label: 'Agree', value: '4' },
    { label: 'Strongly Agree', value: '5' },
  ];

export const questionOnlyQuestions = questions.filter(q => q.type !== 'header');
