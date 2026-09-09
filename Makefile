include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for JODU5164x
LUCI_DEPENDS:=+luci-base +curl +openssl-util +telnet-bsd +luci-compat
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-jodu5164x-status
PKG_VERSION:=3.1.0
PKG_RELEASE:=1
PKG_LICENSE:=All-Rights-Reserved
PKG_MAINTAINER:=Manish Matwa Choudhary

# Include luci.mk if present in feeds (standard OpenWrt SDK setup)
ifneq ($(wildcard $(TOPDIR)/feeds/luci/luci.mk),)
  include $(TOPDIR)/feeds/luci/luci.mk
else
  include $(INCLUDE_DIR)/package.mk

  define Package/$(PKG_NAME)
    SECTION:=luci
    CATEGORY:=LuCI
    SUBMENU:=3. Applications
    TITLE:=$(LUCI_TITLE)
    DEPENDS:=$(LUCI_DEPENDS)
    PKGARCH:=$(LUCI_PKGARCH)
  endef

  define Package/$(PKG_NAME)/description
    LuCI support for JODU5164x (JODU51641 / JODU51642).
    Provides real-time ODU signal monitoring for OpenWrt.
  endef

  define Package/$(PKG_NAME)/conffiles
/etc/config/jodu5164x
  endef

  define Build/Configure
  endef

  define Build/Compile
  endef

  define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/
	cp -pR ./root/* $(1)/
	$(INSTALL_DIR) $(1)/www
	cp -pR ./htdocs/* $(1)/www/
	chmod 0755 $(1)/usr/libexec/* 2>/dev/null || true
	chmod 0755 $(1)/etc/init.d/* 2>/dev/null || true
  endef
endif

define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	chmod 0755 /etc/init.d/jodu5164x* 2>/dev/null || true
	chmod 0755 /usr/libexec/jodu5164x* 2>/dev/null || true
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache /tmp/luci-sessions/*
	/etc/init.d/rpcd reload 2>/dev/null
	if [ -f /etc/init.d/jodu5164x-updater ]; then
		/bin/sh /etc/init.d/jodu5164x-updater enable 2>/dev/null
		/bin/sh /etc/init.d/jodu5164x-updater restart 2>/dev/null
	fi
}
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	if [ -f /etc/init.d/jodu5164x-updater ]; then
		/bin/sh /etc/init.d/jodu5164x-updater stop 2>/dev/null
		/bin/sh /etc/init.d/jodu5164x-updater disable 2>/dev/null
	fi
}
exit 0
endef

ifeq ($(wildcard $(TOPDIR)/feeds/luci/luci.mk),)
  $(eval $(call BuildPackage,$(PKG_NAME)))
endif
