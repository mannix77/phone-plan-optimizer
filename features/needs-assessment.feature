Feature: Needs-based plan recommendation
  Every plan has unlimited calls and texts, so the needs assessment asks
  only about what the carriers' plan definitions actually differ on:
  priority (premium) data, high-speed hotspot data, and international
  use. Plans that don't meet the stated needs are excluded, and the best
  option is the qualifying plan with the lowest true 24-month cost.

  Background:
    Given 1 line with no new devices

  Scenario: Minimal needs exclude nothing
    Given the user needs "light" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then no plan is excluded by needs

  Scenario: Moderate data use requires priority data
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" plan is excluded by needs
    And the "Verizon Unlimited Plus" plan is included
    And the "AT&T Extra 2.0" plan is included

  Scenario: Heavy data use requires a large priority-data allotment
    Given the user needs "heavy" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "AT&T Value 2.0" plan is excluded by needs
    And the "AT&T Extra 2.0" plan is included

  Scenario: Maximum data use requires unlimited premium data
    Given the user needs "maximum" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "AT&T Extra 2.0" plan is excluded by needs
    And the "AT&T Premium 2.0" plan is included
    And the "Verizon Unlimited Ultimate" plan is included

  Scenario: A hotspot need filters on the plan's high-speed hotspot allotment
    Given the user needs "light" data, 60 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Verizon Unlimited Plus" plan is excluded by needs
    And the "AT&T Extra 2.0" plan is excluded by needs
    And the "AT&T Premium 2.0" plan is included
    And the "Verizon Unlimited Ultimate" plan is included
    And the "T-Mobile Experience Beyond" plan is included

  Scenario: International use requires a plan that includes it
    Given the user needs "light" data, 0 GB of hotspot, and international use
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" plan is excluded by needs
    And the "Verizon Unlimited Ultimate" plan is included
    And the "T-Mobile Experience Beyond" plan is included
    And the "AT&T Premium 2.0" plan is included

  Scenario: MVNOs without priority data are excluded when priority data is needed
    Given MVNOs are included
    And the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the "Visible Visible Unlimited" plan is excluded by needs

  Scenario: The result reports how many plans the needs excluded
    Given the user needs "maximum" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the excluded-by-needs count plus included plans equals the total plans considered

  Scenario: The recommendation is the cheapest qualifying plan by true cost
    Given the user needs "moderate" data, 0 GB of hotspot, and no international use
    When the scenarios are computed
    Then the first row's plan is included
    And the rows are sorted by true cost ascending
