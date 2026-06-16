<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { slugify } from "~~/server/utils/slug";
import type { TableColumn } from "@nuxt/ui";
import ThemePicker from "~/components/theme/ThemePicker.vue";
definePageMeta({ layout: "admin", middleware: "admin" });

const { data: list } = await useFetch("/api/admin/invitations");
const { data: themes } = await useFetch<any>("/api/admin/themes");

const open = ref(false);
const title = ref("");
const slug = ref("");
const slugTouched = ref(false);
const type = ref<
  "wedding" | "metatah" | "wedding_metatah" | "baby_3mo" | "birthday"
>("wedding");
const themeId = ref("");
const wordId = ref("");
const creating = ref(false);
const error = ref("");

const typeItems = [
  { label: "Pernikahan", value: "wedding" },
  { label: "Pernikahan + Metatah", value: "wedding_metatah" },
  { label: "Metatah", value: "metatah" },
  { label: "3 Bulanan", value: "baby_3mo" },
  { label: "Ulang Tahun", value: "birthday" },
];

const { data: words } = await useFetch<any>("/api/admin/invitation-words", {
  query: { type },
});
const wordItems = computed(() =>
  ((words.value as any)?.words ?? []).map((w: any) => ({
    label: w.name,
    value: w.id,
  })),
);

watch(title, (t) => {
  if (!slugTouched.value) slug.value = slugify(t);
});
watch(type, () => {
  wordId.value = "";
});

const valid = computed(
  () =>
    !!(
      title.value.trim() &&
      slug.value.trim() &&
      type.value &&
      themeId.value &&
      wordId.value
    ),
);

const typeLabel: Record<string, string> = {
  wedding: "Pernikahan",
  wedding_metatah: "Pernikahan + Metatah",
  metatah: "Metatah",
  baby_3mo: "3 Bulanan",
  birthday: "Ulang Tahun",
};

function formatDate(val: string | null | undefined) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const columns: TableColumn<any>[] = [
  { accessorKey: "slug", header: "Slug" },
  { accessorKey: "type", header: "Tipe" },
  { accessorKey: "theme", header: "Tema" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "createdAt", header: "Dibuat" },
  { accessorKey: "updatedAt", header: "Diperbarui" },
  { id: "actions", header: "" },
];

const tableData = computed(() => (list.value as any[]) ?? []);


function openModal() {
  open.value = true;
  if (!themeId.value && (themes.value as any[])?.length)
    themeId.value = (themes.value as any[])[0].id;
}
async function create() {
  if (!valid.value || creating.value) return;
  error.value = "";
  creating.value = true;
  try {
    const inv = await $fetch<{ id: string }>("/api/admin/invitations", {
      method: "POST",
      body: {
        title: title.value,
        slug: slug.value,
        type: type.value,
        themeId: themeId.value,
        invitationWordId: wordId.value,
      },
    });
    await navigateTo(`/admin/invitations/${inv.id}/edit`);
  } catch (e: any) {
    error.value = e?.data?.message ?? "Gagal";
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="invitations">
    <template #header>
      <UDashboardNavbar title="Undangan Saya">
        <template #right>
          <UButton
            icon="i-lucide-plus"
            label="Buat Undangan"
            @click="openModal"
          />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <UTable

        :data="tableData"
        :columns="columns"
        :empty-state="{
          icon: 'i-lucide-mail-open',
          label: 'Belum ada undangan.',
        }"
        class="w-full"
      >
        <!-- Slug -->
        <template #slug-cell="{ row }">
          <span class="font-mono text-sm">{{ row.original.slug }}</span>
        </template>

        <!-- Tipe -->
        <template #type-cell="{ row }">
          <span class="text-sm">{{
            typeLabel[row.original.type] ?? row.original.type
          }}</span>
        </template>

        <!-- Tema -->
        <template #theme-cell="{ row }">
          <span class="text-sm">{{ row.original.themeName }}</span>
        </template>

        <!-- Status -->
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'published' ? 'success' : 'neutral'"
            variant="subtle"
            :label="row.original.status"
          />
        </template>

        <!-- Created At -->
        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted">{{
            formatDate(row.original.createdAt)
          }}</span>
        </template>

        <!-- Updated At -->
        <template #updatedAt-cell="{ row }">
          <span class="text-sm text-muted">{{
            formatDate(row.original.updatedAt)
          }}</span>
        </template>

        <!-- Actions -->
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1 justify-end">
            <UButton
              v-if="row.original.status === 'published'"
              size="xs"
              variant="ghost"
              icon="i-lucide-external-link"
              :to="`/u/${row.original.slug}`"
              target="_blank"
              label="View"
            />
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-pencil"
              :to="`/admin/invitations/${row.original.id}/edit`"
              label="Edit"
            />
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-users"
              :to="`/admin/invitations/${row.original.id}/guests`"
              label="Tamu"
            />
            <UButton
              size="xs"
              variant="ghost"
              icon="i-lucide-clipboard-list"
              :to="`/admin/invitations/${row.original.id}/rsvp`"
              label="RSVP"
            />
          </div>
        </template>
      </UTable>

      <UModal v-model:open="open" title="Buat Undangan">
        <template #body>
          <div class="space-y-3">
            <UFormField label="Judul" required>
              <UInput
                v-model="title"
                placeholder="Judul undangan"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Slug"
              required
              help="slug akan digunakan sebagai url undangan"
            >
              <UInput
                v-model="slug"
                class="w-full"
                @update:model-value="slugTouched = true"
              />
            </UFormField>
            <UFormField label="Tipe" required>
              <USelect v-model="type" :items="typeItems" class="w-full" />
            </UFormField>
            <UFormField label="Tema" required>
              <ThemePicker :themes="(themes as any[]) ?? []" v-model="themeId" />
            </UFormField>
            <UFormField label="Template Konten" required>
              <USelect
                v-model="wordId"
                :items="wordItems"
                placeholder="Pilih kata-kata"
                class="w-full"
              />
            </UFormField>
            <p v-if="error" class="text-sm text-error">{{ error }}</p>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" label="Batal" @click="open = false" />
              <UButton
                label="Buat"
                :loading="creating"
                :disabled="!valid"
                @click="create"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
