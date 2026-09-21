Feature: Trade-in device selection, values, and carrier eligibility
  The user picks the actual phone they'd trade in. Each listed trade-in
  carries the manufacturer program values that were published for it,
  falls back to its tier's typical value where a program hasn't
  published one, and knows whether carriers accept it for promo credits
  (carriers rarely accept iPhone X or older).

  Scenario: A listed trade-in uses the manufacturer's published value for it
    Given 1 line with a new "iPhone 17 (256GB)" and an "iphone16" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 449.00

  Scenario: A trade-in without a published value for that maker falls back to its tier
    Given 1 line with a new "Pixel 10 (128GB)" and an "iphone16" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 219.00

  Scenario: An ineligible trade-in earns no value and no carrier promo
    Given 1 line with a new "iPhone 17 (256GB)" and an "iphone-x-or-older" trade-in
    When the scenarios are computed
    Then the "T-Mobile Experience Beyond" row for "carrier" is not a promo row
    And the "AT&T Value 2.0" row for "mfr" has devices paid of 899.00

  Scenario: A promo that takes any-condition Samsung trade-ins accepts the Galaxy S22
    Given 1 line with a new "Galaxy S26 Ultra (256GB)" and a "galaxy-s22" trade-in
    When the scenarios are computed
    Then the "AT&T Extra 2.0" row for "carrier" is a promo row

  Scenario: The generic tiers still work for phones not on the list
    Given 1 line with a new "iPhone 17 (256GB)" and a "recent" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 449.00

  Scenario: Every listed trade-in declares a tier, eligibility, and a source
    Then every trade-in device has a valid tier, eligibility flag, and an https source
