declare module 'cookie' {
  export interface CookieSerializeOptions {
    domain?: string | undefined
    encode?(val: string): string
    expires?: Date | undefined
    httpOnly?: boolean | undefined
    maxAge?: number | undefined
    path?: string | undefined
    priority?: 'low' | 'medium' | 'high' | undefined
    sameSite?: boolean | 'lax' | 'strict' | 'none' | undefined
    secure?: boolean | undefined
  }

  export function parse(str: string, options?: any): { [key: string]: string }
  export function serialize(
    name: string,
    val: string,
    options?: CookieSerializeOptions
  ): string
}
