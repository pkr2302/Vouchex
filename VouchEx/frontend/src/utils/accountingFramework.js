export const ACCOUNTING_FRAMEWORKS = [
  {
    value: 'AS',
    label: 'AS — Accounting Standards (Schedule III, Division I)',
    description: 'For most private companies and SMEs in India. This is the common choice if you are not on Ind AS.',
    template: 'schedule_iii_as',
  },
  {
    value: 'IND_AS',
    label: 'Ind AS — Indian Accounting Standards (Schedule III, Division II)',
    description: 'For companies required to follow Ind AS (typically larger or listed companies). Report headings follow Ind AS layout.',
    template: 'schedule_iii_ind_as',
  },
];

export function frameworkByValue(value) {
  return ACCOUNTING_FRAMEWORKS.find((f) => f.value === value) || ACCOUNTING_FRAMEWORKS[0];
}
