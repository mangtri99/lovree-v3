<script setup lang="ts">
import { computed } from "vue";
type Row = { label: string; value: string };
const props = defineProps<{ content: { title: string; items: Row[] } }>();
const rows = computed(() =>
  (props.content.items ?? []).filter(
    (r) => (r.label ?? "") !== "" || (r.value ?? "") !== "",
  ),
);
</script>
<template>
  <section
    class="px-6 py-16 text-center"
    style="background: var(--color-bg); color: var(--color-text)"
  >
    <h2
      v-if="content.title"
      class="text-2xl italic"
      style="font-family: var(--font-heading); color: var(--color-primary)"
    >
      {{ content.title }}
    </h2>
    <div
      v-if="content.title"
      class="mx-auto my-4 h-px w-16"
      style="background: var(--color-secondary)"
    />
    <div class="mx-auto mt-2 max-w-md space-y-4">
      <div v-for="(row, i) in rows" :key="i" data-row>
        <p
          v-if="row.label"
          class="text-xs uppercase tracking-[0.2em]"
          style="color: var(--color-secondary)"
        >
          {{ row.label }}
        </p>
        <p v-if="row.value" data-value class="mt-1 whitespace-pre-line">
          {{ row.value }}
        </p>
      </div>
    </div>
  </section>
</template>
