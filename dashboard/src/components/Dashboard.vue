<template>
  <div>
    <v-container class="d-flex flex-row mt-6">
      <v-card
        v-for="service in services"
        :key="service.serviceKey"
        class="mt-4"
        max-width="400"
      >
        <v-card-text>
          <div class="display-1 font-weight-light mb-2">
            {{ service.serviceKey }}
          </div>

          <v-chip
            v-for="chip in chipsFor(service.feedCache)"
            :key="chip.key"
            class="ma-2"
            color="green"
            text-color="white"
          >
            <v-avatar
              left
              class="green darken-4"
            >
              {{ chip.value }}
            </v-avatar>
            {{ chip.text }}
          </v-chip>
          <v-alert
            v-if="numberOfCurrentSubscriptions(service) > 0"
            color="green"
            icon="mdi-access-point"
            class="mt-3 white--text"
            dense
          >
            <span>{{ numberOfCurrentSubscriptions(service) }} currently active subscription</span>
            <span v-if="numberOfCurrentSubscriptions(service) > 1">s</span>
          </v-alert>

          <a
            :href="service.autoDiscoveryURL"
            class="subheading font-weight-light grey--text"
          >{{ service.autoDiscoveryURL }}</a>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',

  data: () => ({
    services: [],
  }),
  async mounted() {
    const response = await fetch('http://localhost:4000/stats').then((r) => r.json());
    this.services = response.services;
  },
  methods: {
    chipsFor(feedCache) {
      return Object.entries(feedCache).map(([key, obj]) => {
        switch (key) {
          case 'system_information':
            return {
              key: 'system_information',
              value: 'ok',
              text: 'System Information',
            };
          case 'system_alerts':
            return {
              key: 'system_alerts',
              value: obj.alerts.length,
              text: 'Alerts',
            };

          case 'free_bike_status':
            return {
              key: 'free_bike_status',
              value: obj.bikes.length,
              text: 'Free Bikes',
            };

          case 'station_status':
            return {
              key: 'station_status',
              value: obj.stations.length,
              text: 'Stations',
            };

          case 'station_information':
            return {
              key: 'station_information',
              value: obj.stations.length,
              text: 'Station Information',
            };

          default:
            return null;
        }
      }).filter((chip) => chip !== null);
    },
    numberOfCurrentSubscriptions(service) {
      return Object.values(service.pubSub.subscriptions)
        .filter((subscription) => subscription[0].includes(service.serviceKey)).length;
    },
  },
};
</script>

<style>
.v-sheet--offset {
  top: -24px;
  position: relative;
}
</style>
