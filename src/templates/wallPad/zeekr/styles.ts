// Global styles for Zeekr wallPad template
// Inject this as a raw CSS string or use in a <style> block
export const globalStyles = `
/* === Font Faces === */
@font-face {
  font-family: 'ly-regular';
  src: url('./assets/fonts/LynkcoType-Regular.ttf');
}
@font-face {
  font-family: 'ly-light';
  src: url('./assets/fonts/LynkcoType-Light.ttf');
}
@font-face {
  font-family: 'ly-medium';
  src: url('./assets/fonts/LynkcoType-Medium.ttf');
}
@font-face {
  font-family: 'ly-bold';
  src: url('./assets/fonts/LynkcoType-Bold.ttf');
}
@font-face {
  font-family: 'DingTalk';
  src: url('./assets/fonts/方正兰亭准黑简体.TTF');
}
@font-face {
  font-family: 'DingNumber';
  src: url('./assets/fonts/DINPro-Medium.ttf');
}
@font-face {
  font-family: 'DINPro';
  src: url('./assets/fonts/DINPro-Medium.ttf');
}

/* === Reset === */
.zeekr-wallpad *,
.zeekr-wallpad *::before,
.zeekr-wallpad *::after {
  box-sizing: border-box;
  margin: 0;
  font-weight: normal;
}

.zeekr-wallpad {
  color: #fff;
  font-family: 'ly-regular', 'DingTalk', sans-serif;
}

/* === Flex utilities === */
.zeekr-wallpad .flex-row {
  display: flex;
  flex-direction: row;
}
.zeekr-wallpad .flex-col {
  display: flex;
  flex-direction: column;
}
.zeekr-wallpad .justify-between {
  display: flex;
  justify-content: space-between;
}
.zeekr-wallpad .justify-start {
  display: flex;
  justify-content: flex-start;
}
.zeekr-wallpad .justify-center {
  display: flex;
  justify-content: center;
}
.zeekr-wallpad .justify-around {
  display: flex;
  justify-content: space-around;
}
.zeekr-wallpad .align-center {
  display: flex;
  align-items: center;
}
.zeekr-wallpad .align-end {
  display: flex;
  align-items: flex-end;
}
.zeekr-wallpad .align-left {
  display: flex;
  align-items: flex-start;
}

/* === Element Plus overrides === */
.zeekr-wallpad .el-dialog {
  background: #2E3A4D;
  border-radius: 16px;
  color: #fff;
}
.zeekr-wallpad .el-dialog.soc-dia {
  background: linear-gradient(250.41deg, rgba(255, 216, 216, 0.95) 3.57%, rgba(255, 255, 255, 0.94) 26.1%, #FFFFFF 97.94%) !important;
  border: 2px solid;
  border-image: linear-gradient(113.99deg, rgba(255, 255, 255, 0.8) 5.73%, rgba(255, 255, 255, 0.1) 42.8%, rgba(255, 255, 255, 0.1) 98.9%);
}
.zeekr-wallpad .el-dialog.soc-dia .el-button--default {
  border: 2px solid #607594;
  background: #ffffff00;
  color: #1E1E1E;
}
.zeekr-wallpad .el-dialog.soc-dia .title {
  color: rgba(90, 45, 40, 1) !important;
  font-size: 24px;
  margin-bottom: 16px;
  font-weight: 700;
}
.zeekr-wallpad .el-dialog.soc-dia .txt1 {
  color: rgba(30, 30, 30, 1);
  font-size: 20px;
  margin-bottom: 20px;
  text-align: left;
  line-height: 30px;
  padding: 0 6px;
}
.zeekr-wallpad .el-dialog.soc-dia .txt2 {
  color: rgba(30, 30, 30, 1);
  font-size: 20px;
  margin-bottom: 10px;
  opacity: 0.5;
  text-align: left;
  padding: 0 6px;
}
.zeekr-wallpad .el-dialog__body {
  color: #fff;
  font-size: 24px;
  text-align: center;
}
.zeekr-wallpad .el-button {
  width: 180px;
  height: 60px;
  border-radius: 98px;
  font-size: 20px;
}
.zeekr-wallpad .el-button--primary {
  background: #ED8733;
  border: 2px solid #ED8733;
  color: #fff;
}
.zeekr-wallpad .el-button--default {
  border: 2px solid #607594;
  background: #ffffff00;
  color: #fff;
}
.zeekr-wallpad .el-button--danger {
  background: rgba(255, 84, 67, 1);
  border: 2px solid rgba(255, 84, 67, 1);
  color: #fff;
}
.zeekr-wallpad .el-button:focus,
.zeekr-wallpad .el-button:hover {
  background: #ED8733;
  border: 2px solid #ED8733;
  color: #fff;
}
.zeekr-wallpad .el-drawer {
  background: #090909;
}
.zeekr-wallpad .el-drawer__body {
  padding: 0;
  height: 100%;
}
.zeekr-wallpad .el-divider--vertical {
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  height: 80%;
  margin: 0 20px;
}
.zeekr-wallpad .el-progress-bar__outer {
  overflow: visible !important;
}
.zeekr-wallpad .el-progress-bar {
  transform: rotate(180deg);
}
.zeekr-wallpad .el-progress-bar__inner::after {
  width: 18px;
  height: 18px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}

/* Progress color classes (global overrides need to be outside scoped) */
.zeekr-wallpad .tem .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.zeekr-wallpad .tem .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.zeekr-wallpad .tem .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}
.zeekr-wallpad .hun .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.zeekr-wallpad .hun .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.zeekr-wallpad .hun .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}
.zeekr-wallpad .qita .el-progress-bar__outer {
  background: linear-gradient(90deg, #EE4730 0%, #F49301 25%, #EEE73D 50%, #87DD8B 75%, #418BFB 100%) !important;
}
.zeekr-wallpad .qita .el-progress-bar__inner {
  background-color: rgba(61, 66, 69, 0.8) !important;
  height: 6px;
  top: -1px;
}
.zeekr-wallpad .qita .el-progress-bar__inner::after {
  width: 6px;
  height: 6px;
  position: absolute;
  right: 0px;
  border-radius: 50%;
  top: -2px;
  border: 4px solid #fff;
}
`
