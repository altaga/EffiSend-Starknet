import { uuidV4 } from "ethers";
import { useNavigation } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createOrFetchFace } from "../../api/createOrFetchFace";
import { createOrFetchWallet } from "../../api/createOrFetchWallet";
import CamFace from "../../components/camFace";
import GlobalStyles, { mainColor, secondaryColor } from "../../core/styles";
import { useStateAsync } from "../../core/useAsyncState";
import {
    randomBytes,
    setAsyncStorageValue,
    setEncryptedStorageValue,
} from "../../core/utils";
import ContextModule from "../../providers/contextModule";

export default function createOrRecover() {
  const [loading, setLoading] = useState(false);
  const [take, setTake] = useStateAsync(false);
  const navigation = useNavigation();
  const context = useContext(ContextModule);

  useEffect(() => {
    const update = async () => {
      if (!context.value.starter) {
        navigation.navigate("(screens)/index");
      } else if (context.value.address !== "") {
        navigation.navigate("(screens)/main");
      }
    };
    context.value.starter && update();
  }, [context.value.address, context.value.starter, navigation.navigate]);
  
  const createWallet = useCallback(async (image) => {
    try {
      const bytes = await randomBytes(16);
      const nonce = `face_${uuidV4(bytes)}`;
      const { result: faceResult } = await createOrFetchFace({ image, nonce });
      if (faceResult === null) {
        setLoading(false);
      } else {
        if (typeof faceResult === "string") {
          const { result: walletResult } = await createOrFetchWallet({
            user: faceResult,
          });
          if (walletResult !== null) {
            const { user, address } = walletResult;
            await setEncryptedStorageValue({ user });
            await setAsyncStorageValue({ address });
            await context.setValueAsync({
              address,
            });
            navigation.navigate("(screens)/main");
            ToastAndroid.show(
              "You have won STRK tokens because you verified",
              ToastAndroid.LONG
            );
            //setLoading(false);
          }
        } else if (typeof faceResult === "boolean" && faceResult === true) {
          const { result: walletResult } = await createOrFetchWallet({
            user: nonce,
          });
          console.log(walletResult);
          if (walletResult !== null) {
            const { user, address } = walletResult;
            await setEncryptedStorageValue({ user });
            await setAsyncStorageValue({ address });
            await context.setValueAsync({
              address,
            });
            navigation.navigate("(screens)/main");
            ToastAndroid.show(
              "You have won STRK tokens because you verified",
              ToastAndroid.LONG
            );
            //setLoading(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={[GlobalStyles.container]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={GlobalStyles.scrollContainer}
        contentContainerStyle={[GlobalStyles.scrollContainerContent, {height: "100%", justifyContent: "space-evenly"}]}
      >
        <View>
          <Text style={GlobalStyles.title}>FaceID</Text>
        </View>
        <View
          style={{
            height: "auto",
            width: "90%",
            borderColor: loading ? mainColor : secondaryColor,
            borderWidth: 5,
            borderRadius: 10,
            aspectRatio: 1,
          }}
        >
          <CamFace
            facing={"front"}
            take={take}
            onImage={(image) => createWallet(image)}
          />
        </View>
        <Pressable
          disabled={loading}
          style={[
            GlobalStyles.buttonStyle,
            { width: "90%" },
            loading ? { opacity: 0.5 } : {},
          ]}
          onPress={async () => {
            setLoading(true);
            await setTake(true);
            await setTake(false);
          }}
        >
          <Text style={[GlobalStyles.buttonText]}>
            {loading ? "Fetching..." : " Join / Recover "}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
