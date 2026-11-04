// Static asset server for the NexusOS download page.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
