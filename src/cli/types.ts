import {
    EXTENSION_LANGUAGES,
    APP_SHARED_DEPS as APP_DEPS,
    API_SHARED_DEPS as API_DEPS,
} from '@directus/shared/constants';

export type Language = typeof EXTENSION_LANGUAGES[number];
export type LanguageShort = 'js' | 'ts';

export const APP_SHARED_DEPS = [...APP_DEPS, '@goairheads/directus-stdextension-builder'];
export const API_SHARED_DEPS = [...API_DEPS, '@goairheads/directus-stdextension-builder'];