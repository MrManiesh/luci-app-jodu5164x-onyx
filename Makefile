include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-jodu5164x-onyx
PKG_VERSION:=1.0.0
PKG_RELEASE:=3
PKG_LICENSE:=GPL-3.0
PKG_SOURCE_PROTO:=local
PKG_SOURCE_URL:=$(CURDIR)

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-jodu5164x-onyx
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI support for JODU5164x
  DEPENDS:=+luci-base +wget +telnet-bsd +luci-compat
  PKGARCH:=all
endef

define Package/luci-app-jodu5164x-onyx/description
  LuCI support for JODU5164x
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/luci-app-jodu5164x-onyx/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-jodu5164x-onyx.json $(1)/usr/share/luci/menu.d/
	
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-jodu5164x-onyx.json $(1)/usr/share/rpcd/acl.d/
	
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/jodu5164x
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/jodu5164x/status.js $(1)/www/luci-static/resources/view/jodu5164x/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/jodu5164x/jio-logo.png $(1)/www/luci-static/resources/view/jodu5164x/
	
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/jodu5164x-data.sh $(1)/usr/libexec/
	$(INSTALL_BIN) ./root/usr/libexec/jodu5164x-setup.sh $(1)/usr/libexec/
	$(INSTALL_BIN) ./root/usr/libexec/jodu5164x_lock.sh $(1)/usr/libexec/
	$(INSTALL_BIN) ./root/usr/libexec/jodu5164x_at.sh $(1)/usr/libexec/
	$(INSTALL_BIN) ./root/usr/libexec/jodu5164x_reboot.sh $(1)/usr/libexec/
	
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./root/etc/config/jodu5164x $(1)/etc/config/
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
