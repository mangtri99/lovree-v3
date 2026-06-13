<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const open = ref(false);

const { user, clear } = useUserSession();

const links = [
  [
    { label: "Dashboard", icon: "i-lucide-layout-dashboard", to: "/admin" },
    { label: "Undangan", icon: "i-lucide-mail", to: "/admin/invitations" },
  ],
] satisfies NavigationMenuItem[][];

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await clear();
  await navigateTo("/login");
}

const userItems = computed(() => [
  [{ label: user.value?.email ?? "Akun", type: "label" as const }],
  [{ label: "Keluar", icon: "i-lucide-log-out", onSelect: () => logout() }],
]);
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar id="default" collapsible resizable>
      <template #header>
        <span class="font-semibold">Lovree</span>
      </template>

      <UNavigationMenu orientation="vertical" :items="links" />

      <template #footer>
        <div class="flex w-full items-center gap-2">
          <UDropdownMenu :items="userItems" class="flex-1">
            <UButton
              :label="user?.name || user?.email || 'Akun'"
              icon="i-lucide-user"
              color="neutral"
              variant="ghost"
              block
              class="justify-start"
            />
          </UDropdownMenu>
          <UColorModeButton />
        </div>
      </template>
    </UDashboardSidebar>
    <slot />
    <NotificationsSlideover />
  </UDashboardGroup>
</template>
