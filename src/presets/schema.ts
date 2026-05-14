import { listPresetIds } from './catalog.js';

/**
 * JSON schema given to the LLM stylist. The `presetId` field MUST be one of
 * the enum values — this is what stops the model from hallucinating fonts.
 */
export function pickerSchema() {
  return {
    name: 'caption_preset_choice',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['presetId'],
      properties: {
        presetId: {
          type: 'string',
          enum: listPresetIds(),
          description: 'The chosen caption preset for this vibe.',
        },
        colorIntensity: {
          type: 'string',
          enum: ['muted', 'normal', 'vivid'],
          description: 'Optional tweak: dampen or boost the preset primary color.',
        },
        caseTransform: {
          type: 'string',
          enum: ['normal', 'uppercase'],
          description: 'Optional tweak: force uppercase or use preset default.',
        },
        rationale: {
          type: 'string',
          maxLength: 140,
          description: 'One-sentence reason for the choice (for logging only).',
        },
      },
    },
  };
}

export interface PickerOutput {
  presetId: string;
  colorIntensity?: 'muted' | 'normal' | 'vivid';
  caseTransform?: 'normal' | 'uppercase';
  rationale?: string;
}
