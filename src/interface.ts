interface SourceLocation {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export interface Words {
  value: string;
  loc: SourceLocation;
  isJsxAttr?: boolean;
  isJsxText?: boolean;
  isTemplate?: boolean;
  rawValue?: string;
  key?: string;
  id: string;
  [k: string]: any;
}

export interface Language {
  langType: string;
  localeFileName: string;
}
