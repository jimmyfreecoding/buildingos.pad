export const http = (url, method = 'GET', data = undefined) => {
  // baseUrl
  const baseUrl = 'http://10.205.66.7:1880'

  return fetch(
    baseUrl + url,
    {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: data
    }
  ).then((response) => response.json())
}