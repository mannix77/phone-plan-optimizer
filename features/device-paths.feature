Feature: Device purchase path calculations
  Each acquisition path is costed over a 24-month window. Carrier
  financing spreads full retail over the carrier's term (36 months), so
  the balance still owed at month 24 is reported separately.
  Manufacturer financing and outright purchase apply the manufacturer's
  trade-in credit. Lease uses the program's published monthly price.

  Background:
    Given 1 line with a new "iPhone 17 (256GB)" and no trade-in

  Scenario: Carrier financing with no promo spreads retail over 36 months
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "carrier" has devices paid of 599.33
    And the "AT&T Value 2.0" row for "carrier" has owed at month 24 of 299.67
    And the "AT&T Value 2.0" row for "carrier" has upfront of 0.00

  Scenario: Manufacturer financing with no trade-in pays retail with nothing owed
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 899.00
    And the "AT&T Value 2.0" row for "mfr" has owed at month 24 of 0.00

  Scenario: Buying outright is due upfront
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "outright" has upfront of 899.00

  Scenario: The lease path uses the program's monthly price for 24 months
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "lease" has devices paid of 1017.84
    And the "AT&T Value 2.0" row for "lease" has owed at month 24 of 0.00

  Scenario: A manufacturer trade-in reduces the financed amount
    Given 1 line with a new "Galaxy S26 (256GB)" and a "recent" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 179.99

  Scenario: A manufacturer trade-in reduces the outright price
    Given 1 line with a new "iPhone 17 (256GB)" and an "older" trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "outright" has upfront of 699.00

  Scenario: A device with no lease offer produces no lease rows
    Given 1 line with a new "Galaxy S26 (256GB)" and no trade-in
    When the scenarios are computed
    Then no row uses the "lease" path

  Scenario: A device not sold by a carrier falls back to manufacturer financing there
    Given the "Galaxy S26 (256GB)" is not sold by "Verizon"
    And 1 line with a new "Galaxy S26 (256GB)" and no trade-in
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" row for "carrier" has devices paid of 899.99
    And the "Verizon Unlimited Welcome" row for "carrier" has owed at month 24 of 0.00

  Scenario: MVNO plans offer no carrier financing path
    Given MVNOs are included
    When the scenarios are computed
    Then the "Visible Visible Unlimited" plan has no "carrier" row

  Scenario: With no new devices every plan has a single bring-your-own row
    Given 2 lines with no new devices
    When the scenarios are computed
    Then every plan has exactly one row and it uses the "byod" path

  Scenario: Device costs multiply by the number of lines getting a device
    Given 3 lines where 2 get a new "iPhone 17 (256GB)" and no trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 1798.00

  Scenario: A Pixel financed through Google pays retail with nothing owed
    Given 1 line with a new "Pixel 10 (128GB)" and no trade-in
    When the scenarios are computed
    Then the "AT&T Value 2.0" row for "mfr" has devices paid of 799.00
    And the "AT&T Value 2.0" row for "mfr" has owed at month 24 of 0.00

  Scenario: The device catalog covers Apple, Samsung, and Google
    Then the device catalog includes at least 16 devices from at least 4 makers

  Scenario: A device with unverified carrier listings is priced as a manufacturer purchase
    Given 1 line with a new "Motorola Razr Ultra" and no trade-in
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" row for "carrier" has devices paid of 1499.99
    And the "Verizon Unlimited Welcome" row for "carrier" has owed at month 24 of 0.00
