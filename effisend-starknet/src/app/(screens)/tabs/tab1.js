import Clipboard from "@react-native-clipboard/clipboard";
import { formatUnits, uuidV4 } from "ethers";
import { LinearGradient } from "expo-linear-gradient";
import { fetch } from "expo/fetch";
import { Component, Fragment } from "react";
import {
  Keyboard,
  NativeEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  ToastAndroid,
  View
} from "react-native";
import IconIonicons from "react-native-vector-icons/Ionicons";
import { Contract } from "starknet";
import { createPayment } from "../../../api/createPayment";
import QrAddress from "../../../components/qrAddress";
import { abiERC20 } from "../../../contracts/erc20";
import { blockchains, refreshTime } from "../../../core/constants";
import GlobalStyles, { mainColor } from "../../../core/styles";
import {
  arraySum,
  completeStarknetAddress,
  epsilonRound,
  getAsyncStorageValue,
  getEncryptedStorageValue,
  normalizeFontSize,
  randomBytes,
  setAsyncStorageValue,
  setChains,
  setTokens,
  setupProvider,
} from "../../../core/utils";
import { useHOCS } from "../../../hocs/useHOCS";
import ContextModule from "../../../providers/contextModule";

const baseTab1State = {
  // Transaction settings
  amount: "",
  chainSelected: setChains(blockchains)[0], // ""
  tokenSelected: setTokens(blockchains[0].tokens)[0], // ""
  loading: false,
  take: false,
  keyboardHeight: 0,
  selector: 0, // 0
  qrData: "",
  cameraDelayLoading: false, // Force the camera to load when component is mounted and helps UX
};

class Tab1 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab1State;
    this.provider = blockchains.map((x) => setupProvider(x.rpc));
    this.EventEmitter = new NativeEventEmitter();
    this.controller = new AbortController();
  }

  static contextType = ContextModule;

  async getlastRefresh() {
    try {
      const lastRefresh = await getAsyncStorageValue("lastRefresh");
      if (lastRefresh === null) throw "Set First Date";
      return lastRefresh;
    } catch (err) {
      await setAsyncStorageValue({ lastRefresh: 0 });
      return 0;
    }
  }

  async componentDidMount() {
    setTimeout(async () => {
      if (this.context.value.address !== "") {
        // Event Emitter
        this.EventEmitter.addListener("refresh", async () => {
          Keyboard.dismiss();
          await this.setStateAsync(baseTab1State);
          await setAsyncStorageValue({ lastRefresh: Date.now() });
          this.refresh();
        });
        // Get Last Refresh
        const lastRefresh = await this.getlastRefresh();
        if (Date.now() - lastRefresh >= refreshTime) {
          console.log("Refreshing...");
          await setAsyncStorageValue({ lastRefresh: Date.now() });
          this.refresh();
        } else {
          console.log(
            `Next refresh Available: ${Math.round(
              (refreshTime - (Date.now() - lastRefresh)) / 1000,
            )} Seconds`,
          );
        }
      }
    }, 1000);
    setTimeout(() => this.setState({ cameraDelayLoading: true }), 1);
  }

  componentWillUnmount() {
    this.EventEmitter.removeAllListeners("refresh");
  }

  async getUSD() {
    const array = blockchains
      .map((x) => x.tokens.map((token) => token.coingecko))
      .flat();
    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    var requestOptions = {
      signal: this.controller.signal,
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${array.toString()}&vs_currencies=usd`,
      requestOptions,
    );
    const result = await response.json();
    const usdConversionTemp = array.map((x) => result[x].usd);
    let acc = 0;
    const usdConversion = blockchains.map((blockchain) =>
      blockchain.tokens.map(() => {
        acc++;
        return usdConversionTemp[acc - 1];
      }),
    );
    setAsyncStorageValue({ usdConversion });
    this.context.setValue({ usdConversion });
  }

  async refresh() {
    await this.setStateAsync({ refreshing: true });
    try {
      await Promise.all([this.getUSD(), this.getBalance()]);
    } catch (e) {
      console.log(e);
    }
    await this.setStateAsync({ refreshing: false });
  }

  async getBalance() {
    const balances = await this.getBatchBalances();
    await setAsyncStorageValue({ balances });
    this.context.setValue({ balances });
  }

  async getBatchBalances() {
    const tokensArrays = blockchains.map((blockchain) =>
      blockchain.tokens.map((y) => y.address),
    );
    const tokenContracts = tokensArrays.map((tokens, i) =>
      tokens.map((token) => new Contract(abiERC20, token, this.provider[i])),
    );
    const tokenBalances = await Promise.all(
      tokenContracts.map(
        async (tokens) =>
          await Promise.all(
            tokens.map(
              (contract) =>
                contract.balanceOf(this.context.value.address) ?? 0n,
            ),
          ),
      ),
    );
    const balances = blockchains.map((x, i) =>
      x.tokens.map((y, j) => {
        return formatUnits(tokenBalances[i][j], y.decimals);
      }),
    );
    return balances;
  }

  async createQR() {
    try {
      this.setState({
        loading: true,
      });
      const bytes = await randomBytes(16);
      const nonce = uuidV4(bytes);
      const user = await getEncryptedStorageValue("user");
      const { res } = await createPayment({
        nonce,
        user,
      });
      if (res === "BAD REQUEST") {
        await this.setStateAsync({
          loading: false,
        });
        return;
      }
      this.setState({
        loading: false,
        qrData: nonce,
      });
    } catch (err) {
      this.setState({
        loading: false,
      });
      console.log(err);
    }
  }

  // Utils
  async setStateAsync(value) {
    return new Promise((resolve) => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  render() {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          this.context.value.address !== "" && this.state.selector === 0 ? (
            <RefreshControl
              progressBackgroundColor={mainColor}
              refreshing={this.state.refreshing}
              onRefresh={async () => {
                await setAsyncStorageValue({
                  lastRefresh: Date.now().toString(),
                });
                await this.refresh();
              }}
            />
          ) : null
        }
        style={[GlobalStyles.scrollContainer]}
        contentContainerStyle={[
          GlobalStyles.scrollContainerContent,
          {
            width: "100%",
            minHeight: "100%",
            justifyContent: "flex-start",
            alignItems: "center",
          },
        ]}
      >
        <View
          style={{
            width: "90%",
            alignItems: "center",
            alignSelf: "center",
            gap: 20,
            height: "auto",
          }}
        >
          <LinearGradient
            style={{
              justifyContent: "center",
              alignItems: "center",
              width: "110%",
              marginTop: 20,
            }}
            colors={["#000000", "#010101", "#1a1a1a", "#010101", "#000000"]}
          >
            <Text style={[GlobalStyles.title]}>FaceID Balance</Text>
            <Text style={[GlobalStyles.balance]}>
              {`$ ${epsilonRound(
                arraySum(
                  this.context.value.balances
                    .map((blockchain, i) =>
                      blockchain.map(
                        (token, j) =>
                          token * this.context.value.usdConversion[i][j],
                      ),
                    )
                    .flat(),
                ),
                2,
              )} USD`}
            </Text>
          </LinearGradient>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-around",
              alignItems: "center",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            <Pressable
              disabled={this.state.loading}
              style={[
                GlobalStyles.buttonSelectorSelectedStyle,
                this.state.selector !== 0 && {
                  borderColor: "#aaaaaa",
                },
              ]}
              onPress={async () => {
                this.setState({ selector: 0 });
              }}
            >
              <Text style={[GlobalStyles.buttonTextSmall]}>Tokens</Text>
            </Pressable>
            <Pressable
              disabled={this.state.loading}
              style={[
                GlobalStyles.buttonSelectorSelectedStyle,
                this.state.selector !== 1 && {
                  borderColor: "#aaaaaa",
                },
              ]}
              onPress={async () => {
                this.setState({ selector: 1 });
              }}
            >
              <Text style={[GlobalStyles.buttonTextSmall]}>Receive</Text>
            </Pressable>
            <Pressable
              disabled={this.state.loading}
              style={[
                GlobalStyles.buttonSelectorSelectedStyle,
                this.state.selector !== 2 && {
                  borderColor: "#aaaaaa",
                },
              ]}
              onPress={async () => {
                this.setState({ selector: 2 });
              }}
            >
              <Text style={[GlobalStyles.buttonTextSmall]}>QR Pay</Text>
            </Pressable>
          </View>
        </View>

        {this.state.selector === 0 && (
          <Fragment>
            {blockchains.map((blockchain, i) =>
              blockchain.tokens.map((token, j) => (
                <View
                  key={`${i}${j}`}
                  style={[GlobalStyles.network, { width: "90%" }]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-around",
                    }}
                  >
                    <View style={GlobalStyles.networkMarginIcon}>
                      <View>{token.icon}</View>
                    </View>
                    <View style={{ justifyContent: "center" }}>
                      <Text style={GlobalStyles.networkTokenName}>
                        {token.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Text style={GlobalStyles.networkTokenData}>
                          {this.context.value.balances[i][j] === 0
                            ? "0"
                            : this.context.value.balances[i][j] < 0.001
                              ? "<0.001"
                              : epsilonRound(
                                  this.context.value.balances[i][j],
                                  3,
                                )}{" "}
                          {token.symbol}
                        </Text>
                        <Text style={GlobalStyles.networkTokenData}>
                          {`  -  ($${epsilonRound(
                            this.context.value.usdConversion[i][j],
                            4,
                          )} USD)`}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ marginHorizontal: 20 }}>
                    <Text style={{ color: "white" }}>
                      $
                      {epsilonRound(
                        this.context.value.balances[i][j] *
                          this.context.value.usdConversion[i][j],
                        2,
                      )}{" "}
                      USD
                    </Text>
                  </View>
                </View>
              )),
            )}
          </Fragment>
        )}
        {this.state.selector === 1 && (
          <Fragment>
            <View
              style={{
                width: "100%",
                flex: 1,
                justifyContent: "space-around",
                alignItems: "center",
              }}
            >
              <QrAddress
                address={completeStarknetAddress(this.context.value.address)}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  width: "100%",
                  gap: 10,
                  paddingBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: normalizeFontSize(22),
                    fontWeight: "bold",
                    color: "white",
                    textAlign: "center",
                    width: "85%",
                  }}
                >
                  {completeStarknetAddress(this.context.value.address) !== "" &&
                    completeStarknetAddress(
                      this.context.value.address,
                    ).substring(
                      0,
                      Math.floor(
                        completeStarknetAddress(this.context.value.address)
                          .length *
                          (1 / 3),
                      ),
                    ) +
                      "\n" +
                      completeStarknetAddress(
                        this.context.value.address,
                      ).substring(
                        completeStarknetAddress(this.context.value.address)
                          .length *
                          (1 / 3),
                        Math.floor(
                          completeStarknetAddress(this.context.value.address)
                            .length *
                            (2 / 3),
                        ),
                      ) +
                      "\n" +
                      completeStarknetAddress(
                        this.context.value.address,
                      ).substring(
                        Math.floor(
                          completeStarknetAddress(this.context.value.address)
                            .length *
                            (2 / 3),
                        ),
                        completeStarknetAddress(this.context.value.address)
                          .length,
                      )}
                </Text>
                <Pressable
                  onPress={() => {
                    Clipboard.setString(
                      completeStarknetAddress(this.context.value.address),
                    );
                    ToastAndroid.show(
                      "Address copied to clipboard",
                      ToastAndroid.LONG,
                    );
                  }}
                  style={{
                    width: "15%",
                    alignItems: "flex-start",
                  }}
                >
                  <IconIonicons name="copy" size={30} color={"white"} />
                </Pressable>
              </View>
            </View>
          </Fragment>
        )}
        {this.state.selector === 2 && (
          <Fragment>
            {this.state.qrData === "" ? (
              <View
                style={{
                  width: "100%",
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Pressable
                  disabled={this.state.loading}
                  style={[
                    GlobalStyles.buttonStyle,
                    this.state.loading ? { opacity: 0.5 } : {},
                  ]}
                  onPress={() => this.createQR()}
                >
                  <Text style={[GlobalStyles.buttonText]}>
                    {this.state.loading ? "Creating..." : "Create QR Payment"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Fragment>
                <View
                  style={{
                    width: "100%",
                    flex: 1,
                    justifyContent: "space-evenly",
                    alignItems: "center",
                  }}
                >
                  <Text style={GlobalStyles.formTitleCard}>Payment QR</Text>
                  <QrAddress address={this.state.qrData} />
                </View>
              </Fragment>
            )}
          </Fragment>
        )}
      </ScrollView>
    );
  }
}

export default useHOCS(Tab1);
