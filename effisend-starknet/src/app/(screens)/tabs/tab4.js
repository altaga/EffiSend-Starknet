import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { chatWithAgent } from "../../../api/chatWithAgent";
import GoogleWallet from "../../../assets/images/GW.png";
import GlobalStyles, { footer, mainColor } from "../../../core/styles";
import {
  formatTimestamp,
  getEncryptedStorageValue,
  sleep,
} from "../../../core/utils";
import ContextModule from "../../../providers/contextModule";

function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onKeyboardDidShow = (e) => setKeyboardHeight(e.endCoordinates.height);
    const onKeyboardDidHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener("keyboardDidShow", onKeyboardDidShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onKeyboardDidHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight - footer;
}

export default function Tab4() {
  const context = React.useContext(ContextModule);
  const scrollView = useRef(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputHeight, setInputHeight] = useState("auto");
  const keyboardHeight = useKeyboard();

  function responseModifier(response) {
    let temp = response;
    // Custom modifications, if needed
    return temp;
  }

  const sendMessage = useCallback(async () => {
    try {
      setLoading(true);
      const userMessage = message;
      setMessage(""); // clear input
      let temp = [...context.value.chatGeneral];
      temp = [
        ...temp,
        {
          message: userMessage,
          type: "user",
          time: Date.now(),
          tool: "",
        },
      ];
      await context.setValueAsync({
        chatGeneral: temp,
      });
      await sleep(100);
      scrollView.current.scrollToEnd({ animated: true });
      const user = await getEncryptedStorageValue("user");
      const { address } = context.value;
      const response = await chatWithAgent({
        message,
        context: { user, address },
      });
      const finalResponse = responseModifier(response);
      temp = [
        ...temp,
        {
          message: finalResponse.message,
          type: "system",
          time: Date.now(),
          tool: response["last_tool"],
        },
      ];
      await context.setValueAsync({
        chatGeneral: temp,
      });
      await sleep(100);
      scrollView.current.scrollToEnd({ animated: true });
      setLoading(false);
    } catch (err) {
      console.log(err);
    }
  }, [
    scrollView,
    context.value,
    context.setValueAsync,
    message,
    setMessage,
    setLoading,
  ]);

  return (
    <Fragment>
      <ScrollView
        ref={(view) => {
          scrollView.current = view;
        }}
        showsVerticalScrollIndicator={false}
        style={[GlobalStyles.scrollContainer]}
        contentContainerStyle={[
          GlobalStyles.scrollContainerContent,
          {
            width: "90%",
            height: "auto",
            alignSelf: "center",
            gap: 0,
          },
        ]}
      >
        {context.value.chatGeneral.map((item, index, array) => (
          <LinearGradient
            angle={90}
            useAngle={true}
            key={`Message:${index}`}
            style={[
              {
                borderRadius: 10,
                borderBottomRightRadius: item.type === "user" ? 0 : 10,
                borderBottomLeftRadius: item.type === "user" ? 10 : 0,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxWidth: "80%",
                alignSelf: item.type === "user" ? "flex-end" : "flex-start",
              },
              index !== 0 && array[index - 1].type !== item.type
                ? { marginTop: 16 }
                : { marginTop: 5 },
            ]}
            colors={[
              item.type === "user" ? mainColor + "cc" : mainColor + "40",
              item.type === "user" ? mainColor + "cc" : mainColor + "40",
            ]}
          >
            <Text
              style={{
                color: "white",
                textAlign: "justify",
                marginBottom: 10,
                fontSize: 16,
              }}
            >
              {item.message}
            </Text>
            {item.tool === "fund_metamask_card" && (
              <Pressable
                style={{
                  padding: 10,
                }}
                onPress={() => {
                  Linking.openURL(
                    "intent://com.google.android.apps.walletnfcrel/#Intent;scheme=android-app;package=com.google.android.apps.walletnfcrel;end",
                  );
                }}
              >
                <Image
                  style={{
                    height: "auto",
                    width: "100%",
                    aspectRatio: 854 / 197,
                    alignSelf: "center",
                  }}
                  source={GoogleWallet}
                />
              </Pressable>
            )}
            <Text
              style={{
                color: "#cccccc",
                alignSelf: "flex-end",
                fontSize: 12,
                marginRight: -5,
                marginBottom: -5,
              }}
            >
              {formatTimestamp(item.time)}
            </Text>
          </LinearGradient>
        ))}
      </ScrollView>
      <View
        style={[
          {
            height: "auto",
            width: "94%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            marginVertical: 10,
          },
        ]}
      >
        <TextInput
          onPressOut={() => scrollView.current.scrollToEnd({ animated: true })}
          onChange={() => scrollView.current.scrollToEnd({ animated: true })}
          onFocus={() => scrollView.current.scrollToEnd({ animated: true })}
          multiline
          onContentSizeChange={(event) => {
            if (event.nativeEvent.contentSize.height < 120) {
              setInputHeight(event.nativeEvent.contentSize.height);
              scrollView.current.scrollToEnd({ animated: true });
            }
          }}
          style={[
            GlobalStyles.inputChat,
            {
              height: inputHeight,
            },
          ]}
          keyboardType="default"
          value={message}
          onChangeText={setMessage}
        />
        <Pressable
          onPress={sendMessage}
          disabled={message.length <= 0 || loading}
          style={[
            {
              width: "10%",
              height: "auto",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: mainColor,
              borderRadius: 50,
              aspectRatio: 1,
              padding: 6,
            },
            message.length <= 0 || loading ? { opacity: 0.5 } : {},
          ]}
        >
          {loading ? (
            <ActivityIndicator size={22} color="white" />
          ) : (
            <Ionicons name="send" size={22} color="white" />
          )}
        </Pressable>
      </View>
      {/* this spacer view will push up your input so it's never overlapped by the keyboard */}
      <View style={{ height: keyboardHeight }} />
    </Fragment>
  );
}
