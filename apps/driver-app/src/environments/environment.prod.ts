export const environment = {
  production: true,
  get apiUrl() {
    return typeof window !== 'undefined' ? window.location.origin : '';
  },
  wsUrl: '',
};
