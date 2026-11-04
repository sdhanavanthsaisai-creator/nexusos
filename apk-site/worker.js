// Static asset server for the Study Hall download page.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
