<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <div class="d-flex align-center">
        <span>gbfsQL by MIA map intelligence agency</span>
      </div>
      <v-spacer />
      <v-toolbar-title>Active Feeds</v-toolbar-title>

      <v-spacer />

      <v-btn
        href="https://github.com/mapintelligenceagency/gbfsQL/releases"
        target="_blank"
        text
      >
        <span class="mr-2">Latest Release</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-content>
      <Dashboard />
    </v-content>
  </v-app>
</template>

<script>
import Dashboard from './components/Dashboard.vue';

export default {
  name: 'App',

  components: {
    Dashboard,
  },

  data: () => ({
    //
  }),
};
</script>
