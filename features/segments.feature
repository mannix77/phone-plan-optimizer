Feature: Eligibility-segment pricing (55+, military, first responder, student)
  Carriers price differently for people who can verify eligibility. The
  consultation asks once; segment plans appear only for the matching
  segment, general plans always compete, and plans with a line cap drop
  out with a stated reason when the account has more lines.

  Background:
    Given 1 line with no new devices

  Scenario: Segment plans never appear without eligibility
    When the scenarios are computed
    Then the "T-Mobile Essentials Choice 55" plan is not considered

  Scenario: 55+ pricing appears alongside the general plans
    Given the user qualifies for "plus55" pricing
    When the scenarios are computed
    Then the "T-Mobile Essentials Choice 55" rows have a 24-month plan cost of 1080.00
    And the "Verizon Unlimited Welcome" plan is included

  Scenario: A two-line-capped plan drops out at three lines with a stated reason
    Given 3 lines with no new devices
    And the user qualifies for "plus55" pricing
    When the scenarios are computed
    Then the "T-Mobile Essentials Choice 55" plan is excluded by its line limit
    And the "T-Mobile Experience More w/ 55+ Savings" plan is included

  Scenario: Military pricing at four lines
    Given 4 lines with no new devices
    And the user qualifies for "military" pricing
    When the scenarios are computed
    Then the "T-Mobile Experience More w/ Military Savings" rows have a 24-month plan cost of 3840.00
    And the "T-Mobile Experience Beyond w/ First Responder Savings" plan is not considered

  Scenario: First responder pricing at four lines
    Given 4 lines with no new devices
    And the user qualifies for "firstResponder" pricing
    When the scenarios are computed
    Then the "T-Mobile Experience Beyond w/ First Responder Savings" rows have a 24-month plan cost of 2400.00

  Scenario: Student pricing
    Given the user qualifies for "student" pricing
    When the scenarios are computed
    Then the "T-Mobile Essentials Saver w/ Student Perks" rows have a 24-month plan cost of 720.00

  Scenario: Every segment plan declares valid eligibility
    Then every segment plan has valid eligibility ids and prices up to its line cap

  Scenario: Verizon's military discount is an account-level credit on general plans
    Given 4 lines with no new devices
    And the user qualifies for "military" pricing
    When the scenarios are computed
    Then the "Verizon Unlimited Welcome" rows have a 24-month plan cost of 2400.00

  Scenario: AT&T's Appreciation discount takes 20% off the top unlimited tier
    Given the user qualifies for "healthcare" pricing
    When the scenarios are computed
    Then the "AT&T Premium 2.0" rows have a 24-month plan cost of 1728.00

  Scenario: AT&T's Appreciation discount tiers down the lineup
    Given the user qualifies for "military" pricing
    When the scenarios are computed
    Then the "AT&T Value 2.0" rows have a 24-month plan cost of 1080.00
    And the "AT&T Extra 2.0" rows have a 24-month plan cost of 1428.00

  Scenario: Students get AT&T's Signature discount on Premium only
    Given the user qualifies for "student" pricing
    When the scenarios are computed
    Then the "AT&T Premium 2.0" rows have a 24-month plan cost of 1728.00
    And the "AT&T Value 2.0" rows have a 24-month plan cost of 1200.00

  Scenario: 55+ plans replace discounts rather than stacking
    Given the user qualifies for "plus55" pricing
    When the scenarios are computed
    Then the "Verizon 55+ Unlimited (Florida only)" rows have a 24-month plan cost of 1488.00
    And the "Verizon Unlimited Welcome" rows have a 24-month plan cost of 1560.00
