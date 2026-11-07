import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Os tipos do banco são gerados pelo Supabase a partir do dev e nunca editados à mão; o `tsc`
  // continua checando o arquivo
  globalIgnores(['dist', 'coverage', 'src/types/database.ts']),
  {
    // Sem `eslint-disable` no código: exceção a uma regra só aqui, onde é revisada.
    // Um comentário de desativação vira aviso, e o `--max-warnings=0` reprova.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CLAUDE.md §6: `any` é banido, sem exceção (já vem do strictTypeChecked; fica explícito)
      '@typescript-eslint/no-explicit-any': 'error',
      // CLAUDE.md §6: funções e métodos públicos com tipo de retorno explícito
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // Os primitivos `Label` e `Input` contam como rótulo e campo: o app não usa um sem o outro
      'jsx-a11y/label-has-associated-control': [
        'error',
        { labelComponents: ['Label'], controlComponents: ['Input'] },
      ],
    },
  },
  {
    // frontend/CLAUDE.md §10: gráfico só pelo wrapper, que aplica o tema e os formatadores
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: ['src/components/charts/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Regex ancorada no nome do pacote: o padrão de .gitignore casaria @/theme/echarts
              regex: '^echarts(-for-react)?(/|$)',
              message: 'Gráfico só pelo wrapper de @/components/charts (frontend/CLAUDE.md §10).',
            },
          ],
        },
      ],
    },
  },
  {
    // Importação modular: as entradas inteiras puxam o ECharts todo (~1 MB) para o bundle
    files: ['src/components/charts/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'echarts',
              message:
                'Importe de echarts/core, echarts/charts, echarts/components e echarts/renderers.',
              // Tipo é apagado no build; alguns só existem nesta entrada
              allowTypeImports: true,
            },
            {
              name: 'echarts-for-react',
              message:
                'Use echarts-for-react/esm/core: a entrada padrão importa o ECharts inteiro.',
            },
          ],
          patterns: [
            {
              group: ['echarts-for-react/lib/*'],
              message: 'Use echarts-for-react/esm/core: lib/ é a versão CommonJS.',
            },
          ],
        },
      ],
    },
  },
  {
    // Primitivos do shadcn exportam as variantes que outros primitivos reutilizam
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowCompoundComponents: true,
          allowExportNames: ['buttonVariants', 'badgeVariants', 'tabsListVariants'],
        },
      ],
    },
  },
  {
    // O Label genérico recebe o `htmlFor` de quem o usa; lá a regra acima vale
    files: ['src/components/ui/label.tsx'],
    rules: {
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Por último: desliga as regras de estilo que o Prettier já cuida
  prettier,
]);
