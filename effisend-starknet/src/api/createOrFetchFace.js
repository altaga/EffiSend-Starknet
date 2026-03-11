import { fetchWithRetries } from "../core/fetchWithRetry";

async function createOrFetchFace(body) {
  const myHeaders = new Headers();
  myHeaders.append("X-API-Key", process.env.EXPO_PUBLIC_AI_URL_API_KEY);
  myHeaders.append("Content-Type", "application/json");
  const raw = JSON.stringify(body);
  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };
  return new Promise((resolve) => {
    fetchWithRetries(`${process.env.EXPO_PUBLIC_FACEID_API}fetchOrSave`, requestOptions)
      .then((response) => response.json())
      .then((result) => resolve(result))
      .catch(() => resolve(null));
  });
}

export { createOrFetchFace };