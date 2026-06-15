const vModelInput = (tag: string) => ({
  props: ['modelValue', 'type', 'placeholder', 'disabled', 'accept'],
  emits: ['update:modelValue'],
  template: `<${tag} :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
})
export const nuxtUiStubs = {
  UInput: vModelInput('input'),
  UTextarea: vModelInput('textarea'),
  USelect: { props: ['modelValue', 'items'], emits: ['update:modelValue'], template: '<select @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="i in items" :key="i.value" :value="i.value">{{ i.label }}</option><slot/></select>' },
  UButton: { props: ['label', 'disabled', 'icon', 'color', 'variant'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot>{{ label }}</slot></button>' },
  UCheckbox: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' },
  UFormField: { props: ['label'], template: '<label><span>{{ label }}</span><slot/></label>' },
  UCard: { template: '<div><slot/></div>' },
}
