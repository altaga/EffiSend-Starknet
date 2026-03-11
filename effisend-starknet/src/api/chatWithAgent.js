async function chatWithAgent(body) {
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
    fetch(`${process.env.EXPO_PUBLIC_AGENT_URL_API}`, requestOptions)
      .then((response) => response.json())
      .then((result) => resolve(result))
      .catch(() => resolve(null));
  });
}

export { chatWithAgent };