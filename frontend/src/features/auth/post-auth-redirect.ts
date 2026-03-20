const POST_AUTH_REDIRECT_KEY = "postAuthRedirect"

export function setPostAuthRedirect(path: string) {
  if (!path) {
    return
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, path)
}

export function consumePostAuthRedirect() {
  const path = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)
  if (!path) {
    return null
  }

  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY)
  return path
}
