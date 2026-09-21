Feature: 24-month plan cost calculation
  The plan side of the total is the per-line price at the chosen line
  count, times lines, times 24 months, honoring intro pricing and the
  user's own taxes-and-fees estimate.

  Scenario: Single line on a top-tier plan
    Given 1 line with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Ultimate" rows have a 24-month plan cost of 2160.00

  Scenario: Multi-line pricing uses the per-line price for that line count
    Given 4 lines with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows have a 24-month plan cost of 2880.00

  Scenario: Intro pricing is honored for the intro months only
    Given 1 line with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Mint Mobile Mint Unlimited" rows have a 24-month plan cost of 540.00

  Scenario: Google Fi's published two-line price is used and not estimated
    Given 2 lines with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Google Fi Unlimited Essentials" rows have a 24-month plan cost of 1440.00
    And the "Google Fi Unlimited Essentials" rows are not flagged as estimated

  Scenario: Google Fi's published three-line total is used exactly
    Given 3 lines with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Google Fi Unlimited Essentials" rows have a 24-month plan cost of 1920.00
    And the "Google Fi Unlimited Essentials" rows are not flagged as estimated

  Scenario: T-Mobile Essentials Saver single-line pricing
    Given 1 line with no new devices
    When the scenarios are computed
    Then the "T-Mobile Essentials Saver" rows have a 24-month plan cost of 1200.00

  Scenario: A price the source did not publish is flagged as estimated
    Given 3 lines with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows are flagged as estimated

  Scenario: AT&T's published two-line prices are used and not estimated
    Given 2 lines with no new devices
    When the scenarios are computed
    Then the "AT&T Premium 2.0" rows have a 24-month plan cost of 3840.00
    And the "AT&T Premium 2.0" rows are not flagged as estimated
    And the "AT&T Value 2.0" rows have a 24-month plan cost of 2160.00

  Scenario: AT&T Elite 2.0 single-line pricing
    Given 1 line with no new devices
    When the scenarios are computed
    Then the "AT&T Elite 2.0" rows have a 24-month plan cost of 2640.00

  Scenario: AT&T Elite 2.0 four-line pricing
    Given 4 lines with no new devices
    When the scenarios are computed
    Then the "AT&T Elite 2.0" rows have a 24-month plan cost of 7200.00

  Scenario: A price the source published is not flagged as estimated
    Given 4 lines with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows are not flagged as estimated
