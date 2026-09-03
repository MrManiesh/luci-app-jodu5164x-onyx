include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-jodu5164x-onyx
PKG_VERSION:=1.0.0
PKG_RELEASE:=3
PKG_LICENSE:=GPL-3.0

LUCI_TITLE:=LuCI support for JODU5164x
LUCI_DEPENDS:=+luci-base +wget +telnet-bsd +luci-compat
LUCI_PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-jodu5164x-onyx/description
  LuCI support for JODU5164x (JODU51641 / JODU51642).
  Provides real-time ODU signal monitoring for OpenWrt.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) $(CURDIR)/root $(PKG_BUILD_DIR)/
	$(CP) $(CURDIR)/htdocs $(PKG_BUILD_DIR)/
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/luci-app-jodu5164x-onyx/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/root/usr/share/luci/menu.d/luci-app-jodu5164x-onyx.json $(1)/usr/share/luci/menu.d/

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/root/usr/share/rpcd/acl.d/luci-app-jodu5164x-onyx.json $(1)/usr/share/rpcd/acl.d/

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/jodu5164x
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/htdocs/luci-static/resources/view/jodu5164x/status.js $(1)/www/luci-static/resources/view/jodu5164x/
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/htdocs/luci-static/resources/view/jodu5164x/jio-logo.png $(1)/www/luci-static/resources/view/jodu5164x/

	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/root/usr/libexec/jodu5164x-data.sh $(1)/usr/libexec/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/root/usr/libexec/jodu5164x-setup.sh $(1)/usr/libexec/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/root/usr/libexec/jodu5164x_lock.sh $(1)/usr/libexec/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/root/usr/libexec/jodu5164x_at.sh $(1)/usr/libexec/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/root/usr/libexec/jodu5164x_reboot.sh $(1)/usr/libexec/

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/root/etc/config/jodu5164x $(1)/etc/config/
endef

define Package/luci-app-jodu5164x-onyx/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache /tmp/luci-sessions/*
	/etc/init.d/rpcd restart
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-jodu5164x-onyx))
