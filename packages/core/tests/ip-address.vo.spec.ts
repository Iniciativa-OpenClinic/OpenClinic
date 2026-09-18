import { describe, it, expect } from 'vitest';
import { IPv4Address, IPv6Address, IpAddress } from '../src/domain/value-objects/index.js';
import { ValidationError } from '../src/errors/index.js';

describe('IPv4Address Value Object', () => {
  it('should validate and create a valid standard IPv4 address', () => {
    const raw = '192.168.1.100';
    const ip = IPv4Address.create(raw);
    expect(ip.value).toBe(raw);
    expect(ip.octets).toEqual([192, 168, 1, 100]);
    expect(ip.isPrivate()).toBe(true);
    expect(ip.isLoopback()).toBe(false);
  });

  it('should correctly identify loopback addresses', () => {
    const loopback = IPv4Address.create('127.0.0.1');
    expect(loopback.isLoopback()).toBe(true);
    expect(loopback.isPrivate()).toBe(false);

    const loopbackSubnet = IPv4Address.create('127.255.0.1');
    expect(loopbackSubnet.isLoopback()).toBe(true);
  });

  it('should correctly identify private network ranges', () => {
    // 10.0.0.0/8
    expect(IPv4Address.create('10.0.0.1').isPrivate()).toBe(true);
    expect(IPv4Address.create('10.255.255.255').isPrivate()).toBe(true);

    // 172.16.0.0/12
    expect(IPv4Address.create('172.16.0.1').isPrivate()).toBe(true);
    expect(IPv4Address.create('172.31.255.255').isPrivate()).toBe(true);
    expect(IPv4Address.create('172.32.0.1').isPrivate()).toBe(false);

    // 192.168.0.0/16
    expect(IPv4Address.create('192.168.0.1').isPrivate()).toBe(true);
    expect(IPv4Address.create('192.169.0.1').isPrivate()).toBe(false);

    // Public IPs
    expect(IPv4Address.create('8.8.8.8').isPrivate()).toBe(false);
    expect(IPv4Address.create('1.1.1.1').isPrivate()).toBe(false);
  });

  it('should correctly identify link-local and broadcast addresses', () => {
    expect(IPv4Address.create('169.254.1.1').isLinkLocal()).toBe(true);
    expect(IPv4Address.create('192.168.1.1').isLinkLocal()).toBe(false);

    expect(IPv4Address.create('255.255.255.255').isBroadcast()).toBe(true);
    expect(IPv4Address.create('255.255.255.254').isBroadcast()).toBe(false);
  });

  it('should reject invalid octets and malformed addresses', () => {
    const invalids = [
      '256.0.0.1', // octet > 255
      '192.168.1.300', // octet > 255
      '01.1.1.1', // leading zero
      '192.168.01.1', // leading zero
      '192.168.1', // only 3 octets
      '192.168.1.1.1', // 5 octets
      '192.168.1.a', // non-numeric
      '192.168.-1.1', // negative
      '-1.0.0.1',
      '',
      '   ',
      'not-an-ip',
    ];

    for (const inv of invalids) {
      expect(IPv4Address.isValid(inv)).toBe(false);
      expect(() => IPv4Address.create(inv)).toThrow(ValidationError);
    }
  });

  it('should support createOptional correctly', () => {
    expect(IPv4Address.createOptional(null)).toBeNull();
    expect(IPv4Address.createOptional(undefined)).toBeNull();
    expect(IPv4Address.createOptional('')).toBeNull();
    expect(IPv4Address.createOptional('  ')).toBeNull();

    const created = IPv4Address.createOptional('10.0.0.1');
    expect(created).not.toBeNull();
    expect(created?.value).toBe('10.0.0.1');

    expect(() => IPv4Address.createOptional('invalid')).toThrow(ValidationError);
  });
});

describe('IPv6Address Value Object', () => {
  it('should validate and create valid IPv6 addresses', () => {
    const validAddresses = [
      '::1',
      '::',
      'fe80::1',
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      '2001:db8::1',
      '2001:db8:85a3::8a2e:370:7334',
      '::ffff:192.168.1.1',
    ];

    for (const addr of validAddresses) {
      expect(IPv6Address.isValid(addr)).toBe(true);
      const vo = IPv6Address.create(addr);
      expect(vo.value).toBe(addr.trim().toLowerCase());
    }
  });

  it('should identify loopback, unspecified, and link-local IPv6 addresses', () => {
    const loopback = IPv6Address.create('::1');
    expect(loopback.isLoopback()).toBe(true);
    expect(loopback.isUnspecified()).toBe(false);

    const unspecified = IPv6Address.create('::');
    expect(unspecified.isUnspecified()).toBe(true);
    expect(unspecified.isLoopback()).toBe(false);

    const linkLocal = IPv6Address.create('fe80::1ff:fe00:3a60');
    expect(linkLocal.isLinkLocal()).toBe(true);
    expect(linkLocal.isLoopback()).toBe(false);
  });

  it('should detect and extract IPv4-mapped IPv6 addresses', () => {
    const mapped = IPv6Address.create('::ffff:192.168.1.50');
    expect(mapped.isIPv4Mapped()).toBe(true);

    const extracted = mapped.toIPv4Mapped();
    expect(extracted).not.toBeNull();
    expect(extracted?.value).toBe('192.168.1.50');
    expect(extracted?.isPrivate()).toBe(true);

    const nonMapped = IPv6Address.create('2001:db8::1');
    expect(nonMapped.isIPv4Mapped()).toBe(false);
    expect(nonMapped.toIPv4Mapped()).toBeNull();
  });

  it('should reject malformed IPv6 addresses', () => {
    const invalids = [
      '2001:::1', // triple colon
      '2001:db8::1::2', // multiple double colons
      '2001:xyz::1', // invalid hex
      '12345::1', // 5 hex chars in group
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334:1234', // 9 groups
      '127.0.0.1', // IPv4, not IPv6
      '::ffff:999.999.999.999', // invalid IPv4 tail
      '',
      '   ',
    ];

    for (const inv of invalids) {
      expect(IPv6Address.isValid(inv)).toBe(false);
      expect(() => IPv6Address.create(inv)).toThrow(ValidationError);
    }
  });

  it('should support createOptional correctly', () => {
    expect(IPv6Address.createOptional(null)).toBeNull();
    expect(IPv6Address.createOptional(undefined)).toBeNull();
    expect(IPv6Address.createOptional('')).toBeNull();

    const created = IPv6Address.createOptional('::1');
    expect(created).not.toBeNull();
    expect(created?.value).toBe('::1');

    expect(() => IPv6Address.createOptional('invalid')).toThrow(ValidationError);
  });
});

describe('IpAddress Unified Value Object', () => {
  it('should polymorphically create IPv4 and IPv6 instances', () => {
    const ipv4 = IpAddress.create('192.168.1.1');
    expect(ipv4.version).toBe('IPv4');
    expect(ipv4.isIPv4()).toBe(true);
    expect(ipv4.isIPv6()).toBe(false);
    expect(ipv4.isPrivate()).toBe(true);
    expect(ipv4.toIPv4()).not.toBeNull();
    expect(ipv4.toIPv6()).toBeNull();

    const ipv6 = IpAddress.create('2001:db8::1');
    expect(ipv6.version).toBe('IPv6');
    expect(ipv6.isIPv4()).toBe(false);
    expect(ipv6.isIPv6()).toBe(true);
    expect(ipv6.toIPv6()).not.toBeNull();
    expect(ipv6.toIPv4()).toBeNull();
  });

  it('should correctly detect loopback for both versions', () => {
    expect(IpAddress.create('127.0.0.1').isLoopback()).toBe(true);
    expect(IpAddress.create('::1').isLoopback()).toBe(true);
    expect(IpAddress.create('192.168.1.1').isLoopback()).toBe(false);
  });

  it('should reject invalid values', () => {
    expect(IpAddress.isValid('invalid-ip')).toBe(false);
    expect(() => IpAddress.create('invalid-ip')).toThrow(ValidationError);
  });

  it('should handle createOptional gracefully', () => {
    expect(IpAddress.createOptional(null)).toBeNull();
    expect(IpAddress.createOptional(undefined)).toBeNull();
    expect(IpAddress.createOptional('')).toBeNull();
    expect(IpAddress.createOptional('  ')).toBeNull();

    const validV4 = IpAddress.createOptional('10.0.0.1');
    expect(validV4).not.toBeNull();
    expect(validV4?.version).toBe('IPv4');

    const validV6 = IpAddress.createOptional('::1');
    expect(validV6).not.toBeNull();
    expect(validV6?.version).toBe('IPv6');

    expect(() => IpAddress.createOptional('malformed')).toThrow(ValidationError);
  });

  it('should support value object equality', () => {
    const ip1 = IpAddress.create('127.0.0.1');
    const ip2 = IpAddress.create('127.0.0.1');
    const ip3 = IpAddress.create('192.168.1.1');
    const ip6 = IpAddress.create('::1');

    expect(ip1.equals(ip2)).toBe(true);
    expect(ip1.equals(ip3)).toBe(false);
    expect(ip1.equals(ip6)).toBe(false);
    expect(ip1.equals(null)).toBe(false);
  });
});
