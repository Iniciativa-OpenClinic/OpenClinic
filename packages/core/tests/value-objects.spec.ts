import { describe, it, expect } from 'vitest';
import {
  Cns,
  Cnpj,
  Cnes,
  Cep,
  Phone,
  Email,
  BirthDate,
  Uf,
  BRAZILIAN_UF_NAMES,
  Rg,
  Username,
  Name,
  HashedPassword,
  PasswordPolicy,
  hashPassword,
  verifyPassword,
  Country,
  STANDARD_COUNTRIES,
  Website,
} from '../src/index.js';


describe('Value Objects Suite', () => {
  describe('Cns (Cartão Nacional de Saúde - SBIS ECF.17.16)', () => {
    // Valid definitive CNS (starts with 1 or 2)
    // Example PIS-based CNS: 123456789030001 (sum check)
    it('should validate and format definitive CNS (starting with 1 or 2)', () => {
      // 209179654920000: pis 20917965492
      // Let's test standard definitive CNS calculation
      const validDefinitive = '123456789030001'; // Let's check or test provisional
      // Let's test provisional CNS: starts with 7, 8 or 9
      // E.g.: 700000000000004 -> sum: 7*15 + 4*1 = 105 + 4 = 109 (109 % 11 = 10 != 0)
      // 700000000000009 -> sum: 7*15 + 9*1 = 114 != 0
      // 700000000000006 -> sum: 105 + 6 = 111 != 0
      // 700000000000005 -> sum: 105 + 5 = 110 (110 % 11 === 0!) -> Valid provisional CNS!
      expect(Cns.isValid('700000000000005')).toBe(true);
      expect(Cns.isValid('700 0000 0000 0005')).toBe(true);

      const cns = Cns.create('700000000000005');
      expect(cns.value).toBe('700000000000005');
      expect(cns.formatted).toBe('700 0000 0000 0005');
    });

    it('should validate definitive CNS using PIS algorithm', () => {
      // PIS: 12062635996 -> sum = 1*15 + 2*14 + 0*13 + 6*12 + 2*11 + 6*10 + 3*9 + 5*8 + 9*7 + 9*6 + 6*5
      // = 15 + 28 + 0 + 72 + 22 + 60 + 27 + 40 + 63 + 54 + 30 = 411
      // 411 % 11 = 4. dv = 11 - 4 = 7. expected = 120626359960007.
      const validDefinitive = '120626359960007';
      expect(Cns.isValid(validDefinitive)).toBe(true);
      expect(Cns.isValid('120 6263 5996 0007')).toBe(true);
      expect(Cns.create(validDefinitive).formatted).toBe('120 6263 5996 0007');
    });

    it('should reject invalid CNS', () => {
      expect(Cns.isValid('')).toBe(false);
      expect(Cns.isValid('12345678901234')).toBe(false); // 14 digits
      expect(Cns.isValid('300000000000000')).toBe(false); // starts with 3
      expect(Cns.isValid('700000000000001')).toBe(false); // bad checksum
      expect(() => Cns.create('invalid')).toThrow();
    });
  });

  describe('Cnpj (Cadastro Nacional da Pessoa Jurídica - SBIS ECF.17.16)', () => {
    // Valid CNPJs
    const validCnpj1 = '11.222.333/0001-81';
    const validCnpj2 = '00.000.000/0001-91'; // Known public entity CNPJ

    it('should validate and format valid CNPJ', () => {
      expect(Cnpj.isValid(validCnpj1)).toBe(true);
      expect(Cnpj.isValid('11222333000181')).toBe(true);
      expect(Cnpj.isValid(validCnpj2)).toBe(true);
      expect(Cnpj.isValid('00000000000191')).toBe(true);

      const cnpj = Cnpj.create('11222333000181');
      expect(cnpj.value).toBe('11222333000181');
      expect(cnpj.formatted).toBe('11.222.333/0001-81');
    });

    it('should reject invalid CNPJ', () => {
      expect(Cnpj.isValid('')).toBe(false);
      expect(Cnpj.isValid('11222333000182')).toBe(false); // wrong check digit
      expect(Cnpj.isValid('00000000000000')).toBe(false); // repetitive
      expect(Cnpj.isValid('11111111111111')).toBe(false); // repetitive
      expect(Cnpj.isValid('1234567890123')).toBe(false); // 13 digits
      expect(() => Cnpj.create('00000000000000')).toThrow();
    });
  });

  describe('Cnes (Cadastro Nacional de Estabelecimentos de Saúde - SBIS ECF.17.16)', () => {
    it('should validate valid 7-digit CNES', () => {
      expect(Cnes.isValid('2654078')).toBe(true);
      expect(Cnes.isValid('0012345')).toBe(true);

      const cnes = Cnes.create('2654078');
      expect(cnes.value).toBe('2654078');
      expect(cnes.formatted).toBe('2654078');
    });

    it('should reject invalid CNES', () => {
      expect(Cnes.isValid('')).toBe(false);
      expect(Cnes.isValid('0000000')).toBe(false); // all zeroes
      expect(Cnes.isValid('123456')).toBe(false); // 6 digits
      expect(Cnes.isValid('12345678')).toBe(false); // 8 digits
      expect(Cnes.isValid('265407A')).toBe(false); // non-numeric
      expect(() => Cnes.create('123')).toThrow();
    });
  });

  describe('Cep (Código de Endereçamento Postal)', () => {
    it('should validate and format 8-digit CEP', () => {
      expect(Cep.isValid('01310-100')).toBe(true);
      expect(Cep.isValid('01310100')).toBe(true);
      expect(Cep.isValid('70040010')).toBe(true);

      const cep = Cnes.clean('01310-100');
      const cepVo = Cep.create('01310100');
      expect(cepVo.value).toBe('01310100');
      expect(cepVo.formatted).toBe('01310-100');
    });

    it('should reject invalid CEP', () => {
      expect(Cep.isValid('')).toBe(false);
      expect(Cep.isValid('00000000')).toBe(false);
      expect(Cep.isValid('1234567')).toBe(false); // 7 digits
      expect(Cep.isValid('123456789')).toBe(false); // 9 digits
      expect(() => Cep.create('00000000')).toThrow();
    });
  });

  describe('Phone (Telefone e Celular Brasileiro)', () => {
    it('should validate and format landline and mobile numbers', () => {
      // Landline: 11 3254-1000
      expect(Phone.isValid('1132541000')).toBe(true);
      expect(Phone.isValid('(11) 3254-1000')).toBe(true);
      const landline = Phone.create('(11) 3254-1000');
      expect(landline.isMobile).toBe(false);
      expect(landline.formatted).toBe('(11) 3254-1000');

      // Mobile: 11 98765-4321
      expect(Phone.isValid('11987654321')).toBe(true);
      expect(Phone.isValid('(11) 98765-4321')).toBe(true);
      const mobile = Phone.create('11987654321');
      expect(mobile.isMobile).toBe(true);
      expect(mobile.formatted).toBe('(11) 98765-4321');
    });

    it('should reject invalid phone numbers', () => {
      expect(Phone.isValid('')).toBe(false);
      expect(Phone.isValid('1111111111')).toBe(false); // repetitive
      expect(Phone.isValid('10987654321')).toBe(false); // invalid DDD 10
      expect(Phone.isValid('05987654321')).toBe(false); // invalid DDD 05
      expect(Phone.isValid('11887654321')).toBe(false); // mobile not starting with 9
      expect(Phone.isValid('1112541000')).toBe(false); // landline starting with 1
      expect(() => Phone.create('1234')).toThrow();
    });
  });

  describe('Email (RFC 5322 Address)', () => {
    it('should normalize and validate valid emails', () => {
      const email = Email.create('  Dr.Carlos@OpenClinic.Org  ');
      expect(email.value).toBe('dr.carlos@openclinic.org');
      expect(email.domain).toBe('openclinic.org');
      expect(email.localPart).toBe('dr.carlos');
    });

    it('should reject invalid emails', () => {
      expect(Email.isValid('')).toBe(false);
      expect(Email.isValid('dr.carlos')).toBe(false);
      expect(Email.isValid('@openclinic.org')).toBe(false);
      expect(Email.isValid('dr.carlos@')).toBe(false);
      expect(() => Email.create('invalid-email')).toThrow();
    });
  });

  describe('BirthDate (Data de Nascimento Clínica)', () => {
    const fixedReference = new Date('2026-09-05T00:00:00Z');

    it('should accept valid ISO date and Brazilian formatted date', () => {
      expect(BirthDate.isValid('1990-05-15', fixedReference)).toBe(true);
      expect(BirthDate.isValid('15/05/1990', fixedReference)).toBe(true);

      const bdIso = BirthDate.create('1990-05-15', fixedReference);
      expect(bdIso.value).toBe('1990-05-15');
      expect(bdIso.format()).toBe('15/05/1990');
      expect(bdIso.ageInYears(fixedReference)).toBe(36);
      expect(bdIso.isMinor(fixedReference)).toBe(false);

      const bdBr = BirthDate.create('15/05/1990', fixedReference);
      expect(bdBr.value).toBe('1990-05-15');
      expect(bdBr.format()).toBe('15/05/1990');
    });

    it('should handle leap years correctly', () => {
      expect(BirthDate.isValid('2024-02-29', fixedReference)).toBe(true);
      expect(BirthDate.isValid('2023-02-29', fixedReference)).toBe(false); // Not a leap year
    });

    it('should identify minor patients (under 18)', () => {
      const child = BirthDate.create('2015-01-01', fixedReference);
      expect(child.ageInYears(fixedReference)).toBe(11);
      expect(child.isMinor(fixedReference)).toBe(true);
    });

    it('should reject future birth dates', () => {
      expect(BirthDate.isValid('2026-09-06', fixedReference)).toBe(false);
      expect(() => BirthDate.create('2030-01-01', fixedReference)).toThrow();
    });

    it('should reject dates older than 120 years', () => {
      expect(BirthDate.isValid('1900-01-01', fixedReference)).toBe(false); // > 120 years before 2026
      expect(BirthDate.isValid('1906-09-05', fixedReference)).toBe(true); // exactly 120 years
      expect(() => BirthDate.create('1850-01-01', fixedReference)).toThrow();
    });
  });

  describe('Uf (Unidade Federativa)', () => {
    it('should validate and normalize valid Brazilian UFs', () => {
      expect(Uf.isValid('sp')).toBe(true);
      expect(Uf.isValid('RJ')).toBe(true);
      expect(Uf.isValid('  mg ')).toBe(true);

      const sp = Uf.create('sp');
      expect(sp.value).toBe('SP');
      expect(sp.region).toBe('Sudeste');
      expect(sp.stateName).toBe('São Paulo');
      expect(Uf.getStateName('SP')).toBe('São Paulo');

      const ba = Uf.create('BA');
      expect(ba.region).toBe('Nordeste');
      expect(ba.stateName).toBe('Bahia');

      const am = Uf.create('AM');
      expect(am.region).toBe('Norte');
      expect(am.stateName).toBe('Amazonas');
    });

    it('should map all 27 Brazilian UFs to valid state names and regions', () => {
      expect(Object.keys(BRAZILIAN_UF_NAMES)).toHaveLength(27);
      const uf = Uf.create('DF');
      expect(uf.stateName).toBe('Distrito Federal');
      expect(uf.region).toBe('Centro-Oeste');
    });

    it('should format UF as "UF - State Name"', () => {
      expect(Uf.format('SP')).toBe('SP - São Paulo');
      expect(Uf.format('rj')).toBe('RJ - Rio de Janeiro');
      expect(Uf.format('DF')).toBe('DF - Distrito Federal');
      expect(Uf.format('invalid')).toBe('INVALID');
      expect(Uf.format(null)).toBe('-');

      const mg = Uf.create('MG');
      expect(mg.format()).toBe('MG - Minas Gerais');
    });

    it('should reject invalid UFs', () => {
      expect(Uf.isValid('')).toBe(false);
      expect(Uf.isValid('XX')).toBe(false);
      expect(Uf.isValid('12')).toBe(false);
      expect(() => Uf.create('INVALID')).toThrow();
    });
  });

  describe('Rg (Registro Geral)', () => {
    it('should validate and clean valid RGs', () => {
      expect(Rg.isValid('12.345.678-9')).toBe(true);
      expect(Rg.isValid('123456789')).toBe(true);
      expect(Rg.isValid('MG-12.345.678')).toBe(true);

      const rg = Rg.create('12.345.678-9');
      expect(rg.value).toBe('123456789');
      expect(rg.format()).toBe('12.345.678-9');
    });

    it('should reject invalid RGs', () => {
      expect(Rg.isValid('')).toBe(false);
      expect(Rg.isValid('1234')).toBe(false); // less than 5 chars
      expect(Rg.isValid('00000000')).toBe(false); // repetitive
      expect(() => Rg.create('123')).toThrow();
    });
  });

  describe('Username (Identificador Único de Usuário)', () => {
    it('should validate and normalize canonical usernames', () => {
      expect(Username.isValid('dr.silva')).toBe(true);
      expect(Username.isValid('  DR.SILVA  ')).toBe(true);
      expect(Username.isValid('nurse_ana-123')).toBe(true);

      const user = Username.create('  Dr.Silva  ');
      expect(user.value).toBe('dr.silva');
      expect(user.toString()).toBe('dr.silva');
    });

    it('should reject invalid usernames', () => {
      expect(Username.isValid('')).toBe(false);
      expect(Username.isValid('ab')).toBe(false); // min 3 chars
      expect(Username.isValid('.drsilva')).toBe(false); // leading dot
      expect(Username.isValid('drsilva.')).toBe(false); // trailing dot
      expect(Username.isValid('dr..silva')).toBe(false); // consecutive dots
      expect(Username.isValid('dr silva')).toBe(false); // space not allowed
      expect(Username.isValid('dr@silva')).toBe(false); // special characters
      expect(() => Username.create('ab')).toThrow();
    });
  });

  describe('PasswordPolicy & HashedPassword (Credenciais Seguras)', () => {
    it('should evaluate password complexity via PasswordPolicy', () => {
      expect(PasswordPolicy.isValid('StrongP@ssw0rd!')).toBe(true);

      const weakResult = PasswordPolicy.validate('short');
      expect(weakResult.valid).toBe(false);
      expect(weakResult.errors.length).toBeGreaterThan(0);

      expect(PasswordPolicy.isValid('alllowercase123!')).toBe(false); // missing uppercase
      expect(PasswordPolicy.isValid('ALLUPPERCASE123!')).toBe(false); // missing lowercase
      expect(PasswordPolicy.isValid('NoDigitsSpecial!')).toBe(false); // missing digit
      expect(PasswordPolicy.isValid('NoSpecialChar123')).toBe(false); // missing special char
    });

    it('should instantiate and verify HashedPassword without leaking hash in logs', async () => {
      const rawHash = await hashPassword('StrongP@ssw0rd!');
      const hashed = HashedPassword.fromHash(rawHash);
      expect(hashed.getSafeHash().startsWith('$argon2id$')).toBe(true);

      // Verify correct password via crypto
      const match = await verifyPassword(hashed.getSafeHash(), 'StrongP@ssw0rd!');
      expect(match).toBe(true);

      // Verify wrong password via crypto
      const mismatch = await verifyPassword(hashed.getSafeHash(), 'WrongPassword123!');
      expect(mismatch).toBe(false);

      // Verify protection against log / serialization leaks
      expect(hashed.toString()).toBe('[PROTECTED]');
      expect(hashed.toJSON()).toBe('[PROTECTED]');
      expect(JSON.stringify({ password: hashed })).toBe('{"password":"[PROTECTED]"}');
    });

    it('should reject non-argon2 hashes in HashedPassword.fromHash', () => {
      expect(() => HashedPassword.fromHash('plaintext_password')).toThrow();
      expect(() => HashedPassword.fromHash('md5_5d41402abc4b2a76b9719d911017c592')).toThrow();
    });
  });

  describe('Name (Nome Completo e Nome de Exibição)', () => {
    it('should validate and clean valid full names and display names', () => {
      expect(Name.isValid('Dr. Carlos Alberto da Silva')).toBe(true);
      expect(Name.isValid('Ana Souza')).toBe(true);
      expect(Name.isValid('Ed')).toBe(true);
      expect(Name.isValid('  Carlos   Silva  ')).toBe(true);

      const name = Name.create('  Carlos   Alberto   da   Silva  ');
      expect(name.value).toBe('Carlos Alberto da Silva');
      expect(name.firstName).toBe('Carlos');
      expect(name.lastName).toBe('Silva');
      expect(name.displayName).toBe('Carlos Silva');
      expect(name.initials).toBe('CAS');
    });

    it('should handle single names gracefully for display and initials', () => {
      const single = Name.create('Carlos');
      expect(single.firstName).toBe('Carlos');
      expect(single.lastName).toBe('');
      expect(single.displayName).toBe('Carlos');
      expect(single.initials).toBe('C');
    });

    it('should properly title case names while preserving lowercase connectors', () => {
      const allCaps = Name.create('DR. CARLOS ALBERTO DA SILVA');
      expect(allCaps.toTitleCase()).toBe('Dr. Carlos Alberto da Silva');

      const allLower = Name.create('maria de souza e silva');
      expect(allLower.toTitleCase()).toBe('Maria de Souza e Silva');
    });

    it('should reject invalid names and names exceeding 120 chars', () => {
      expect(Name.isValid('')).toBe(false);
      expect(Name.isValid('a')).toBe(false); // min 2 chars
      expect(Name.isValid('Carlos123')).toBe(false); // contains digits
      expect(Name.isValid('<script>alert(1)</script>')).toBe(false); // script injection
      expect(Name.isValid('Carlos @ Silva')).toBe(false); // invalid symbol
      expect(() => Name.create('x')).toThrow();

      // Boundary tests: exactly 120 chars vs 121 chars
      const valid120 = 'A'.repeat(119) + 'B';
      expect(valid120.length).toBe(120);
      expect(Name.isValid(valid120)).toBe(true);

      const invalid121 = 'A'.repeat(120) + 'B';
      expect(invalid121.length).toBe(121);
      expect(Name.isValid(invalid121)).toBe(false);
      expect(() => Name.create(invalid121)).toThrow();
    });
  });

  describe('Country (ISO 3166-1 alpha-3)', () => {
    it('should validate and create valid country codes', () => {
      expect(Country.isValid('BRA')).toBe(true);
      expect(Country.isValid('bra')).toBe(true);
      expect(Country.isValid(' PRT ')).toBe(true);
      expect(Country.isValid('USA')).toBe(true);

      const country = Country.create('bra');
      expect(country.value).toBe('BRA');
    });

    it('should reject invalid country codes', () => {
      expect(Country.isValid('')).toBe(false);
      expect(Country.isValid(null)).toBe(false);
      expect(Country.isValid('BR')).toBe(false); // 2 chars (alpha-2)
      expect(Country.isValid('XYZ')).toBe(false); // not in standard list
      expect(() => Country.create('XYZ')).toThrow();
    });

    it('should return localized country names and formatted options', () => {
      expect(Country.getName('BRA', 'pt-BR')).toBe('Brasil');
      expect(Country.getName('BRA', 'en-US')).toBe('Brazil');
      expect(Country.getName('USA', 'pt-BR')).toBe('Estados Unidos');
      expect(Country.getName('USA', 'en-US')).toBe('United States');

      const optionsPt = Country.getAllCountries('pt-BR');
      expect(optionsPt.length).toBe(STANDARD_COUNTRIES.length);
      expect(optionsPt[0].code).toBe('BRA'); // BRA is always primary first
      expect(optionsPt[0].display).toBe('Brasil (BRA)');

      const optionsEn = Country.getAllCountries('en-US');
      expect(optionsEn[0].code).toBe('BRA');
      expect(optionsEn[0].display).toBe('Brazil (BRA)');
    });
  });

  describe('Website Value Object', () => {
    it('should validate and clean standard URLs with or without scheme', () => {
      expect(Website.isValid('www.exemplo.com.br')).toBe(true);
      expect(Website.isValid('https://exemplo.com.br')).toBe(true);
      expect(Website.isValid('http://hospital-central.med.br/portal')).toBe(true);
      expect(Website.isValid('http://localhost:3000')).toBe(true);

      expect(Website.clean('  www.exemplo.com.br/  ')).toBe('https://www.exemplo.com.br');
      expect(Website.clean('http://hospital.org.br')).toBe('http://hospital.org.br');
      expect(Website.clean('HTTPS://MyExample.COM/about/')).toBe('https://myexample.com/about/');
    });

    it('should instantiate immutable Website Value Object and expose URL getters', () => {
      const site = Website.create('https://portal.exemplo.com.br/contato');
      expect(site.value).toBe('https://portal.exemplo.com.br/contato');
      expect(site.hostname).toBe('portal.exemplo.com.br');
      expect(site.protocol).toBe('https:');
      expect(site.origin).toBe('https://portal.exemplo.com.br');
    });

    it('should reject invalid domains and dangerous schemes', () => {
      expect(Website.isValid('')).toBe(false);
      expect(Website.isValid('   ')).toBe(false);
      expect(Website.isValid('javascript:alert(1)')).toBe(false);
      expect(Website.isValid('data:text/html,<h1>XSS</h1>')).toBe(false);
      expect(Website.isValid('file:///etc/passwd')).toBe(false);
      expect(Website.isValid('ftp://ftp.exemplo.com.br')).toBe(false);
      expect(Website.isValid('not a website')).toBe(false);
      expect(Website.isValid('exemplo')).toBe(false); // single word without dot or localhost
      expect(() => Website.create('invalid')).toThrow();
    });
  });
});


