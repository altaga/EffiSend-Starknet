import { fetchWithRetries } from "../core/fetchWithRetry";

async function fetchFaceID(body) {
  const myHeaders = new Headers();
  myHeaders.append("X-API-Key", process.env.EXPO_PUBLIC_AI_URL_API_KEY);
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify(body);
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
    retry: 3,
    retryDelay: 3000,
  };
  return new Promise((resolve) => {
    fetchWithRetries(`${process.env.EXPO_PUBLIC_FACEID_API}fetch`, requestOptions)
      .then((response) => response.json())
      .then((result) => resolve(result))
      .catch(() => resolve(null));
  });
}

export { fetchFaceID };