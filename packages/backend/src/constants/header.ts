/**
Hint on upload requests: the client-supplied SHA-512 of the body, mixed into the cache key.
 */
export const HEADER_X_FILE_HASH = "x-file-hash"

/**
Hint on the /font/subset response: the payload is a minimal sfnt for PDF embedding.
 */
export const HEADER_X_FONT_SUBSET = "x-font-subset"

/**
Username header for the basic-auth perimeter.
 */
export const HEADER_X_AUTH_USERNAME = "x-auth-username"

/**
Password header for the basic-auth perimeter.
 */
export const HEADER_X_AUTH_PASSWORD = "x-auth-password"
