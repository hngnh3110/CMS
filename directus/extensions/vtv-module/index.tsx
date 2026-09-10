import { defineModule, useApi } from '@directus/extensions-sdk';
import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue';
import { createRoot, type Root } from 'react-dom/client';
import CmsApp from '../../../components/cms/app';
import '../../../app/globals.css';
declare const vtvStyle: HTMLStyleElement;
const Module = defineComponent({
  setup() {
    const host = ref<HTMLElement>();
    const api = useApi();
    let root: Root;
    const request = async (
      path: string,
      options: { method?: string; body?: unknown } = {},
    ) => {
      try {
        const response = await api.request({
          url: path,
          method: options.method || 'GET',
          data: options.body,
        });
        return response.data;
      } catch (e: any) {
        throw new Error(
          e.response?.data?.errors?.[0]?.message ||
            'Không thể kết nối Directus.',
        );
      }
    };
    onMounted(() => {
      document.head.appendChild(vtvStyle);
      if (host.value) {
        root = createRoot(host.value);
        root.render(<CmsApp request={request} />);
      }
    });
    onBeforeUnmount(() => {
      root?.unmount();
      vtvStyle.remove();
    });
    return () =>
      h('div', {
        ref: host,
        style: {
          position: 'fixed',
          inset: '0',
          zIndex: '20',
          overflow: 'auto',
        },
      });
  },
});
export default defineModule({
  id: 'vtv-cms',
  name: 'VTV CMS',
  icon: 'dashboard',
  routes: [
    { path: '', component: Module },
    { path: ':category/import', component: Module },
  ],
});
