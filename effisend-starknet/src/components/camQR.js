import React, { Component, createRef } from "react";
import {
  Alert,
  PermissionsAndroid,
  Pressable,
  View
} from "react-native";
import { Camera, CameraType } from "react-native-camera-kit";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { mainColor } from "../core/styles";
import { isValidUUID } from "../core/utils";

export default class CamQR extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refresh: true,
      facing: this.props.facing,
      scanning: true,
      permission: false,
    };
    this.data = createRef(null);
    this.scanning = true;
  }

  async componentDidMount() {
    this.scanning = true;

    const checkCam = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    if (!checkCam) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]).then((result) => {
        if (result["android.permission.CAMERA"] === "granted") {
          this.setState({
            permission: true,
          });
        } else {
          Alert.alert(
            "Permissions denied!",
            "You need to give permissions to camera"
          );
        }
      });
    } else {
      this.setState({
        permission: true,
      });
    }
  }

  handleQRread(data) {
    if (isValidUUID(data) && this.scanning) {
      this.scanning = false;
      this.setState(
        {
          scanning: false,
        },
        () => {
          this.props.callbackAddress(data);
        }
      );
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.state.refresh && this.state.permission && (
          <Camera
            style={{ height: "100%", width: "100%" }}
            scanBarcode={this.state.scanning}
            onReadCode={(event) =>
              this.handleQRread(event.nativeEvent.codeStringValue)
            }
            showFrame={false}
            ratioOverlay={"1:1"}
            cameraType={
              this.state.facing === "front" ? CameraType.Front : CameraType.Back
            }
          />
        )}
        <View style={{ position: "absolute", margin: 10 }}>
          <Pressable
            onPress={() => {
              this.setState(
                {
                  facing: this.state.facing === "back" ? "front" : "back",
                  refresh: false,
                },
                () => {
                  this.setState({ refresh: true });
                }
              );
            }}
            style={[
              {
                width: "auto",
                height: "auto",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: mainColor,
                borderColor: "white",
                borderWidth: 2,
                borderRadius: 50,
                aspectRatio: 1,
                padding: 6,
              },
            ]}
          >
            <MaterialIcons name="cameraswitch" size={22} color="white" />
          </Pressable>
        </View>
      </React.Fragment>
    );
  }
}
