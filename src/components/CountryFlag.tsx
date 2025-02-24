import React from 'react';
import ReactCountryFlag from 'react-country-flag';

const countryMapping: Record<string, string> = {
  'USA': 'US',
  'Turkey': 'TR',
  'Japan': 'JP',
  'Sweden': 'SE',
  'France': 'FR',
  'Brazil': 'BR',
  'Germany': 'DE',
  'Australia': 'AU',
  'Canada': 'CA',
};

function getCountryFlagUtil(country: string) {
  const countryCode = countryMapping[country] || country;
  return (
    <ReactCountryFlag
      countryCode={countryCode}
      svg
      style={{
        width: '1.5em',
        height: '1.5em',
        marginRight: '0.5em',
      }}
      title={country}
    />
  );
}

export default getCountryFlagUtil;
