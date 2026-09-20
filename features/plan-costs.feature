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

  Scenario: The taxes and fees estimate is added per line per month
    Given 4 lines with no new devices
    And an estimated taxes and fees of 5.00 per line per month
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows have a 24-month plan cost of 3360.00

  Scenario: Intro pricing is honored for the intro months only
    Given 1 line with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "Mint Mobile Mint Unlimited" rows have a 24-month plan cost of 540.00

  Scenario: A price the source did not publish is flagged as estimated
    Given 3 lines with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows are flagged as estimated

  Scenario: A price the source published is not flagged as estimated
    Given 4 lines with no new devices
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows are not flagged as estimated
