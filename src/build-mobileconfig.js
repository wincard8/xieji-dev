/* 生成 iOS 描述文件（Web Clip）：安装后在主屏幕生成「协纪黄历」图标
 * 用法：node build-mobileconfig.js
 * 输出：../site/xieji-huangli.mobileconfig
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const site = path.join(__dirname, '..', 'site');
const iconPath = path.join(site, 'apple-touch-icon.png');
const icon = fs.readFileSync(iconPath).toString('base64');

const URL_SITE = 'https://wincard8.github.io/huangli/';
const uuid = () => crypto.randomUUID().toUpperCase();

const webclip = `		<dict>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadIdentifier</key>
			<string>com.wincard8.xieji.webclip</string>
			<key>PayloadUUID</key>
			<string>${uuid()}</string>
			<key>PayloadDisplayName</key>
			<string>协纪黄历</string>
			<key>Label</key>
			<string>协纪黄历</string>
			<key>URL</key>
			<string>${URL_SITE}</string>
			<key>FullScreen</key>
			<true/>
			<key>IsRemovable</key>
			<true/>
			<key>Icon</key>
			<data>
${icon.replace(/(.{64})/g, '\t\t\t$1\n')}			</data>
		</dict>`;

const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
	<dict>
		<key>PayloadContent</key>
		<array>
${webclip}
		</array>
		<key>PayloadType</key>
		<string>Configuration</string>
		<key>PayloadVersion</key>
		<integer>1</integer>
		<key>PayloadIdentifier</key>
		<string>com.wincard8.xieji.profile</string>
		<key>PayloadUUID</key>
		<string>${uuid()}</string>
		<key>PayloadDisplayName</key>
		<string>协纪黄历 · 主屏幕图标</string>
		<key>PayloadDescription</key>
		<string>在 iPhone 主屏幕添加「协纪黄历」图标，点击即以全屏方式打开 https://wincard8.github.io/huangli/ 。本描述文件只含一个网页快捷方式，不含任何权限或配置。</string>
		<key>PayloadOrganization</key>
		<string>协纪黄历</string>
		<key>PayloadRemovalDisallowed</key>
		<false/>
	</dict>
</plist>
`;

const out = path.join(site, 'xieji-huangli.mobileconfig');
fs.writeFileSync(out, profile, 'utf8');
console.log('已生成', out, (profile.length / 1024).toFixed(1) + ' KB');
