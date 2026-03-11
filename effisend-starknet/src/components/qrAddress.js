import { Component } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { normalizeFontSize } from '../core/utils';
import { Dimensions, View } from 'react-native';

export default class QrAddress extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps){
    if(prevProps.address !== this.props.address){
      console.log(this.props.address);
      this.forceUpdate();
    }
  }
  render() {
    return (
      <View style={{backgroundColor:"white", alignItems:"center", justifyContent:"center", padding:20, borderRadius:10}}>
      <QRCode
        value={this.props.address}
        size={Dimensions.get("screen").width * 0.65}
        ecl='H'
      />
      </View>
    );
  }
}
