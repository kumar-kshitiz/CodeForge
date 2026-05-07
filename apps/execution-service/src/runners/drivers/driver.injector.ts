import { IO_REGISTRY } from './io.registry';

export class DriverInjector {
  static inject(code: string, language: string, problemSlug?: string): string {
    if (!problemSlug) return code;
    
    const drivers = IO_REGISTRY[problemSlug];
    if (!drivers) return code;

    const wrapper = drivers[language];
    if (!wrapper) return code;

    // Smart detection: if user already wrote their own I/O or main function, do not inject our wrapper!
    if (language === 'cpp' && /\bmain\s*\(/.test(code)) return code;
    if (language === 'python' && (/sys\.stdin/.test(code) || /input\(/.test(code))) return code;
    if (language === 'javascript' && /fs\.readFileSync\(0/.test(code)) return code;

    return `${code}\n\n${wrapper}`;
  }
}
