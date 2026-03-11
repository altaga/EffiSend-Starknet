import { Fragment, useCallback, useContext, useEffect } from "react";
import { getAsyncStorageValue } from "../core/utils";
import ContextModule from "./contextModule";

export default function ContextLoader() {
  const context = useContext(ContextModule);
  const checkStarter = useCallback(async () => {
    const address = await getAsyncStorageValue("address");
    if (address !== null) {
      const balances = await getAsyncStorageValue("balances");
      const usdConversion = await getAsyncStorageValue("usdConversion");
      await context.setValueAsync({
        address: address ?? context.value.address,
        balances: balances ?? context.value.balances,
        usdConversion: usdConversion ?? context.value.usdConversion,
      });
    }
    await context.setValueAsync({
      starter: true,
    });
  }, [context]);

  useEffect(() => {
    checkStarter();
  }, []);

  return <Fragment />;
}
