<script setup lang="ts">
const igHandle = "lovree.invitation";
const igUrl = "https://instagram.com/lovree.invitation";
const waNumber = "+628761729712";
const waUrl = "https://wa.me/628761729712";
</script>

<template>
  <footer class="copyright">
    <div class="copyright__brand">
      <Icon name="tabler:mail-heart" size="26" />
      <span class="copyright__name">Lovree Invitation</span>
    </div>

    <div class="copyright__contacts">
      <a
        class="copyright__contact"
        :href="igUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="tabler:brand-instagram" size="20" />
        <span>{{ igHandle }}</span>
      </a>

      <span class="copyright__divider" aria-hidden="true" />

      <a
        class="copyright__contact"
        :href="waUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="tabler:brand-whatsapp" size="20" />
        <span>{{ waNumber }}</span>
      </a>
    </div>

    <p class="copyright__rights">© All right reserved by Lovree Invitation</p>
  </footer>
</template>

<style scoped>
.copyright {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem;
  background: var(--color-bg);
  color: var(--color-text);
  text-align: center;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    sans-serif;
}
.copyright__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.copyright__name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.copyright__contacts {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  justify-content: center;
}
.copyright__contact {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 14px;
  color: var(--color-text);
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.copyright__contact:hover {
  opacity: 0.65;
}
.copyright__divider {
  width: 1px;
  height: 1.4rem;
  background: currentColor;
  opacity: 0.25;
}
.copyright__rights {
  margin: 0;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.55;
}
</style>
