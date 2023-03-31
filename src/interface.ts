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
  loc: SourceLocation | undefined;
}