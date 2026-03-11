import ImageResizer from "@bam.tech/react-native-image-resizer";
import React, { Component, createRef } from "react";
import {
  Alert,
  Image,
  PermissionsAndroid,
  Pressable,
  View
} from "react-native";
import { Camera, CameraType } from "react-native-camera-kit";
import RNFS from "react-native-fs";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { mainColor } from "../core/styles";

export default class CamFace extends Component {
  constructor(props) {
    super(props);
    this.state = {
      take: false,
      cameraReady: false,
      refresh: true,
      facing: this.props.facing,
      permission: false,
    };
    this.data = createRef(null);
    this.camera;
  }

  async componentDidMount() {
    console.log(this.state.facing);
    this.setState({ cameraReady: true });
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

  async takePicture() {
    const { uri } = await this.camera.capture();
    const res = await Image.getSize(uri);
    const ratio = res.width / res.height;
    const heightD = 512;
    const widthD = Math.round(heightD * ratio);
    const resizedImage = await ImageResizer.createResizedImage(
      uri, // image uri
      widthD, // new width
      heightD, // new height
      "JPEG", // format
      100 // quality (0-100)
    );
    const base64 = await RNFS.readFile(resizedImage.uri, "base64");
    this.props.onImage(base64);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.take !== this.props.take &&
      this.props.take &&
      this.state.cameraReady
    ) {
      this.takePicture();
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.state.permission && this.state.refresh && (
          <Camera
            cameraType={
              this.state.facing === "front" ? CameraType.Front : CameraType.Back
            }
            ratioOverlay={"1:1"}
            ref={(ref) => (this.camera = ref)}
            style={{ height: "100%", width: "100%" }}
            showFrame={false}
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
            <MaterialIcons name="cameraswitch" size={30} color="white" />
          </Pressable>
        </View>
      </React.Fragment>
    );
  }
}
